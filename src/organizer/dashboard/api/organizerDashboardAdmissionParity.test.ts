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

const credential = "admission-private-test-credential-9e31"
const orgId = "org_test"
const scope = { orgId, eventKey: " event-test " }
const forwardedScope = { orgId, eventKey: "event-test" }
const page = { numItems: 50, cursor: "filter-bound-cursor", endCursor: "filter-bound-end" }
const data = { ok: true }

// This suite verifies transport contracts, not DB authorization or DTO secrecy.
// Foreign canonical IDs, entry-only access and secret projection are covered by
// convex-tests/organizerDashboardAdmission.test.ts,
// convex-tests/organizerDashboardBoxOffice.test.ts and convex-tests/customerAccount.test.ts
// with the actual backend.
const cases = [
  {
    operation: "admission-stats",
    method: "admissionStats",
    fn: "organizerDashboardAdmissionStatsQuery",
    module: "organizerDashboardAdmission",
    kind: "query",
    args: scope,
    forwarded: forwardedScope,
  },
  {
    operation: "admission-checkin",
    method: "admissionCheckin",
    fn: "organizerDashboardAdmissionCheckInMutation",
    module: "organizerDashboardAdmission",
    kind: "mutation",
    args: { ...scope, entrance: " Haupteingang ", ticketCode: "T-1" },
    forwarded: { ...forwardedScope, entrance: "Haupteingang", ticketCode: "T-1" },
  },
  {
    operation: "admission-checkin-revoke",
    method: "admissionCheckinRevoke",
    fn: "organizerDashboardAdmissionCheckInRevokeMutation",
    module: "organizerDashboardAdmission",
    kind: "mutation",
    args: { ...scope, entrance: "Tor", ticketId: "ticket_test" },
    forwarded: { ...forwardedScope, entrance: "Tor", ticketId: "ticket_test" },
  },
  {
    operation: "admission-scanner-link-list",
    method: "admissionScannerLinkList",
    fn: "organizerDashboardAdmissionScannerLinkListQuery",
    module: "organizerDashboardAdmission",
    kind: "query",
    args: scope,
    forwarded: forwardedScope,
  },
  {
    operation: "admission-scanner-link-create",
    method: "admissionScannerLinkCreate",
    fn: "organizerDashboardAdmissionScannerLinkCreateMutation",
    module: "organizerDashboardAdmission",
    kind: "mutation",
    args: { ...scope, label: " Hilfe 1 ", entrance: "Tor", expiresAt: 9999999999999 },
    forwarded: { ...forwardedScope, label: "Hilfe 1", entrance: "Tor", expiresAt: 9999999999999 },
  },
  {
    operation: "admission-scanner-link-revoke",
    method: "admissionScannerLinkRevoke",
    fn: "organizerDashboardAdmissionScannerLinkRevokeMutation",
    module: "organizerDashboardAdmission",
    kind: "mutation",
    args: { orgId, linkId: "link_test" },
    forwarded: { orgId, linkId: "link_test" },
  },
  {
    operation: "boxoffice-sale-create",
    method: "boxofficeSaleCreate",
    fn: "organizerDashboardBoxOfficeSaleCreateMutation",
    module: "organizerDashboardBoxOffice",
    kind: "mutation",
    args: { ...scope, tierKey: "abendkasse", quantity: 2, testHarness: true },
    forwarded: { ...forwardedScope, tierKey: "abendkasse", quantity: 2, testHarness: true },
  },
  {
    operation: "boxoffice-sale-get",
    method: "boxofficeSaleGet",
    fn: "organizerDashboardBoxOfficeSaleGetQuery",
    module: "organizerDashboardBoxOffice",
    kind: "query",
    args: { orgId, saleId: "sale_test" },
    forwarded: { orgId, saleId: "sale_test" },
  },
  {
    operation: "boxoffice-sale-list",
    method: "boxofficeSaleList",
    fn: "organizerDashboardBoxOfficeSaleListQuery",
    module: "organizerDashboardBoxOffice",
    kind: "query",
    args: scope,
    forwarded: forwardedScope,
  },
  {
    operation: "boxoffice-sale-cancel",
    method: "boxofficeSaleCancel",
    fn: "organizerDashboardBoxOfficeSaleCancelMutation",
    module: "organizerDashboardBoxOffice",
    kind: "mutation",
    args: { orgId, saleId: "sale_test" },
    forwarded: { orgId, saleId: "sale_test" },
  },
  {
    operation: "boxoffice-sale-test-pay",
    method: "boxofficeSaleTestPay",
    fn: "organizerDashboardBoxOfficeSaleTestPayMutation",
    module: "organizerDashboardBoxOffice",
    kind: "mutation",
    args: { orgId, saleId: "sale_test", testHarness: true },
    forwarded: { orgId, saleId: "sale_test", testHarness: true },
  },
  {
    operation: "boxoffice-sale-complete",
    method: "boxofficeSaleComplete",
    fn: "organizerDashboardBoxOfficeSaleCompleteMutation",
    module: "organizerDashboardBoxOffice",
    kind: "mutation",
    args: { orgId, saleId: "sale_test", orderId: "order_test" },
    forwarded: { orgId, saleId: "sale_test", orderId: "order_test" },
  },
  {
    operation: "account-ticket-list",
    method: "accountTicketList",
    fn: "customerAccountTicketListQuery",
    module: "customerAccount",
    kind: "query",
    args: { ...page },
    forwarded: { paginationOpts: page },
  },
  {
    operation: "account-order-list",
    method: "accountOrderList",
    fn: "customerAccountOrderListQuery",
    module: "customerAccount",
    kind: "query",
    args: { ...page },
    forwarded: { paginationOpts: page },
  },
  {
    operation: "account-order-get",
    method: "accountOrderGet",
    fn: "customerAccountOrderGetQuery",
    module: "customerAccount",
    kind: "query",
    args: { orderId: "order_test" },
    forwarded: { orderId: "order_test" },
  },
  {
    operation: "account-profile-get",
    method: "accountProfileGet",
    fn: "customerAccountProfileGetQuery",
    module: "customerAccount",
    kind: "query",
    args: {},
    forwarded: {},
  },
  {
    operation: "account-profile-update",
    method: "accountProfileUpdate",
    fn: "customerAccountProfileUpdateMutation",
    module: "customerAccount",
    kind: "mutation",
    args: { name: " Lea S. " },
    forwarded: { name: "Lea S." },
  },
] as const satisfies readonly {
  operation: string
  method: keyof OrganizerDashboardClient
  fn: string
  module: string
  kind: string
  args: object
  forwarded: object
}[]
type AdmissionCase = (typeof cases)[number]

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
  } as unknown as ConvexHttpClient
  return { calls, client, backend: organizerDashboardConvexBackendCreate(client) }
}
function clientCall(sdk: ReturnType<typeof sdkCreate>, method: AdmissionCase["method"], args: unknown, auth = true) {
  return organizerDashboardClientCreate({ client: sdk.client, token: () => (auth ? ` ${credential} ` : " ") })[method](
    args as never,
  )
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
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "ADMISSION_TEST_CRED"],
    env: auth ? { ADMISSION_TEST_CRED: credential } : {},
    stdinText: JSON.stringify(args),
    stdout: (line) => output.push(line),
    backendFromUrl: () => sdk.backend,
  })
  const text = output.join("")
  return { exitCode, text, json: JSON.parse(text) }
}
async function assertForward(entry: AdmissionCase, args: object, forwarded: object) {
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
      kind: entry.kind,
      name: entry.module + ":" + entry.fn,
      args: { token: credential, ...forwarded },
    }),
  )
}
async function assertInvalid(entry: AdmissionCase, args: object) {
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
    test("allowlists and forwards exact canonical function, query/mutation kind, credential and normalized args", async () => {
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
    test("strict inputs reject unknown fields, body auth and historical/sensitive writes before transport", async () => {
      for (const extra of [
        { token: credential },
        { authorization: credential },
        { unexpected: true },
        { customerEmail: "x@example.org" },
        { accessToken: credential },
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
  })
}
