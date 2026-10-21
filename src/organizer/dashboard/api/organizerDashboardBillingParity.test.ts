import { describe, expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult, createResultError, type Result } from "#result"
import { organizerDashboardCliRun } from "#src/cli/organizerDashboardCliRun.ts"
import {
  type OrganizerDashboardClient,
  organizerDashboardClientCreate,
} from "#src/client/organizerDashboardClientCreate.ts"
import { organizerDashboardConvexBackendCreate } from "./organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardHonoCreate } from "./organizerDashboardHonoCreate.ts"
import { organizerDashboardOperations } from "./organizerDashboardOperations.ts"

const credential = "billing-private-test-credential-3c9e"
const orgId = "org_test"
const orderId = "order_test"
const scope = { orgId, orderId }
const data = { refundReference: "refund_test" }

// This suite verifies transport contracts, not DB authorization or billing
// DTO secrecy. Real authorization, scope, and billing evidence are covered
// by convex-tests/organizerDashboardBilling.test.ts and the transport unit
// test with the actual backend.
const cases = [
  {
    operation: "order-refund-request",
    method: "orderRefundRequest",
    fn: "organizerDashboardOrderRefundRequestAction",
    args: {
      ...scope,
      refundReference: " refund_1 ",
      idempotencyKey: " idem_1 ",
      amountCents: 500,
      reason: " Doppelte Buchung ",
    },
    forwarded: {
      ...scope,
      refundReference: "refund_1",
      idempotencyKey: "idem_1",
      amountCents: 500,
      reason: "Doppelte Buchung",
    },
  },
  {
    operation: "order-refund-status",
    method: "orderRefundStatus",
    fn: "organizerDashboardOrderRefundStatusAction",
    args: { ...scope, refundReference: " refund_1 " },
    forwarded: { ...scope, refundReference: "refund_1" },
  },
  {
    operation: "order-invoice-status",
    method: "orderInvoiceStatus",
    fn: "organizerDashboardOrderInvoiceStatusAction",
    args: scope,
    forwarded: scope,
  },
  {
    operation: "order-invoice-pdf",
    method: "orderInvoicePdf",
    fn: "organizerDashboardOrderInvoicePdfAction",
    args: scope,
    forwarded: scope,
  },
  {
    operation: "order-invoice-resend",
    method: "orderInvoiceResend",
    fn: "organizerDashboardOrderInvoiceResendAction",
    args: { ...scope, idempotencyKey: " resend_1 " },
    forwarded: { ...scope, idempotencyKey: "resend_1" },
  },
] as const satisfies readonly {
  operation: string
  method: keyof OrganizerDashboardClient
  fn: string
  args: object
  forwarded: object
}[]
type BillingCase = (typeof cases)[number]

function sdkCreate(response: Result<unknown> | "throw" = createResult(data)) {
  const calls: unknown[] = []
  const invoke = async (kind: string, reference: Parameters<typeof getFunctionName>[0], args: unknown) => {
    calls.push({ kind, name: getFunctionName(reference), args })
    if (response === "throw") throw new Error("SDK echoed " + credential)
    return response
  }
  const client = {
    query: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => invoke("query", ref, args),
    mutation: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => invoke("mutation", ref, args),
    action: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => invoke("action", ref, args),
  } as unknown as ConvexHttpClient
  return { calls, client, backend: organizerDashboardConvexBackendCreate(client) }
}
function clientCall(sdk: ReturnType<typeof sdkCreate>, method: BillingCase["method"], args: unknown, auth = true) {
  return organizerDashboardClientCreate({ client: sdk.client, token: () => (auth ? ` ${credential} ` : " ") })[method](
    args as never,
  ) as unknown
}
function httpCall(sdk: ReturnType<typeof sdkCreate>, operation: string, args: object, auth = true) {
  return organizerDashboardHonoCreate(sdk.backend).request("/api/veranstalter", {
    method: "POST",
    headers: { "content-type": "application/json", ...(auth ? { authorization: "Bearer " + credential } : {}) },
    body: JSON.stringify({ operation, ...args }),
  })
}
async function cliCall(sdk: ReturnType<typeof sdkCreate>, operation: string, args: object, auth = true) {
  const output: string[] = []
  const exitCode = await organizerDashboardCliRun({
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "BILLING_TEST_CRED"],
    env: auth ? { BILLING_TEST_CRED: credential } : {},
    stdinText: JSON.stringify(args),
    stdout: (line) => output.push(line),
    backendFromUrl: () => sdk.backend,
  })
  const text = output.join("")
  return { exitCode, text, json: JSON.parse(text) }
}
async function assertForward(entry: BillingCase, args: object, forwarded: object) {
  const sdk = sdkCreate()
  const http = await httpCall(sdk, entry.operation, args)
  expect(http.status).toBe(200)
  expect(await http.json()).toEqual({ data })
  const cli = await cliCall(sdk, entry.operation, args)
  expect(cli.exitCode).toBe(0)
  expect(cli.json).toEqual({ success: true, data })
  expect(await clientCall(sdk, entry.method, args)).toEqual({ success: true, data })
  expect(sdk.calls).toEqual(
    Array(3).fill({
      kind: "action",
      name: "organizerDashboardBilling:" + entry.fn,
      args: { token: credential, ...forwarded },
    }),
  )
}
async function assertInvalid(entry: BillingCase, args: object) {
  const sdk = sdkCreate()
  const http = await httpCall(sdk, entry.operation, args)
  expect(http.status).toBe(400)
  expect(await http.text()).not.toContain(credential)
  const cli = await cliCall(sdk, entry.operation, args)
  expect(cli.exitCode).toBe(2)
  expect(cli.text).not.toContain(credential)
  const ts = await clientCall(sdk, entry.method, args)
  expect(ts).toMatchObject({ success: false, error: { status: 400 } })
  expect(JSON.stringify(ts)).not.toContain(credential)
  expect(sdk.calls).toEqual([])
}

for (const entry of cases) {
  describe(entry.operation + " transport parity", () => {
    test("allowlists and forwards exact canonical action, kind, credential and normalized args", async () => {
      expect(new Set<string>(organizerDashboardOperations).has(entry.operation)).toBe(true)
      await assertForward(entry, entry.args, entry.forwarded)
    })
    test("missing auth is rejected before any transport on all three surfaces", async () => {
      const sdk = sdkCreate()
      expect((await httpCall(sdk, entry.operation, entry.args, false)).status).toBe(401)
      expect((await cliCall(sdk, entry.operation, entry.args, false)).json).toMatchObject({
        error: { code: "organizer-dashboard.unauthenticated" },
      })
      expect(await clientCall(sdk, entry.method, entry.args, false)).toMatchObject({
        success: false,
        error: { status: 401 },
      })
      expect(sdk.calls).toEqual([])
    })
    test("strict inputs reject unknown fields, body auth and billing references before transport", async () => {
      for (const extra of [
        { token: credential },
        { authorization: credential },
        { unexpected: true },
        { paymentReference: "payment_abc" },
        { orderReference: "order_ABC123" },
        { stripeMode: "test" },
        { organizationId: "org_1" },
      ]) {
        await assertInvalid(entry, { ...entry.args, ...extra })
      }
    })
    test("throwing SDK transport is sanitized identically without credential leakage", async () => {
      const sdk = sdkCreate("throw")
      const http = await httpCall(sdk, entry.operation, entry.args)
      expect(http.status).toBe(503)
      const httpText = await http.text()
      expect(httpText).not.toContain(credential)
      expect(JSON.parse(httpText)).toMatchObject({
        error: { code: "organizer-dashboard.transport-unavailable", message: "Backend transport failed" },
      })
      const cli = await cliCall(sdk, entry.operation, entry.args)
      expect(cli.exitCode).toBe(1)
      expect(cli.text).not.toContain(credential)
      expect(cli.json).toMatchObject({
        error: { code: "organizer-dashboard.transport-unavailable", message: "Backend transport failed" },
      })
      expect(await clientCall(sdk, entry.method, entry.args)).toEqual({
        success: false,
        error: { status: 503, message: "Backend transport failed" },
      })
    })
    test("safe backend failures stay failures using the existing unified catalog fallback", async () => {
      const sdk = sdkCreate(createResultError("organizerDashboardOrderRefundRequestAction", "Permission denied"))
      const http = await httpCall(sdk, entry.operation, entry.args)
      expect(http.status).toBe(500)
      expect(await http.json()).toMatchObject({ error: { code: "platform.internal", message: "Permission denied" } })
      expect((await cliCall(sdk, entry.operation, entry.args)).json).toMatchObject({
        error: { code: "platform.internal", message: "Permission denied" },
      })
      expect(await clientCall(sdk, entry.method, entry.args)).toEqual({
        success: false,
        error: { status: 503, message: "Permission denied" },
      })
    })
  })
}

const refundRequest = cases[0]
const refundStatus = cases[1]
const invoiceResend = cases[4]

test("refund identities keep the billing charset and boundaries on every surface", async () => {
  for (const fields of [
    { refundReference: "" },
    { refundReference: " " },
    { refundReference: "x".repeat(201) },
    { refundReference: "bad ref!" },
    { idempotencyKey: "" },
    { idempotencyKey: "x".repeat(256) },
    { idempotencyKey: "bad key!" },
  ]) {
    await assertInvalid(refundRequest, { ...refundRequest.args, ...fields })
    await assertInvalid(refundStatus, { ...refundStatus.args, ...fields })
  }
  await assertInvalid(invoiceResend, { ...invoiceResend.args, idempotencyKey: "bad key!" })
})

test("refund amounts and reasons are bounded on every surface", async () => {
  for (const fields of [
    { amountCents: 0 },
    { amountCents: -1 },
    { amountCents: 1.5 },
    { reason: "" },
    { reason: " " },
    { reason: "x".repeat(501) },
  ]) {
    await assertInvalid(refundRequest, { ...refundRequest.args, ...fields })
  }
  await assertForward(
    refundRequest,
    { ...refundRequest.args, amountCents: 1, reason: "x".repeat(500) },
    { ...refundRequest.forwarded, amountCents: 1, reason: "x".repeat(500) },
  )
})

test("required scope and idempotency keys are not silently filled", async () => {
  for (const entry of cases) await assertInvalid(entry, { ...entry.args, orgId: " " })
  await assertInvalid(refundStatus, scope)
  await assertInvalid(invoiceResend, scope)
  await assertInvalid(refundRequest, { ...refundRequest.args, refundReference: undefined })
})
