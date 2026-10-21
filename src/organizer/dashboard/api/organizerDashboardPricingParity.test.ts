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

const credential = "pricing-private-test-credential-3c91"
const orgId = "org_test"
const page = { numItems: 50, cursor: "filter-bound-cursor", endCursor: "filter-bound-end" }
const data = { page: [], isDone: false, continueCursor: "next-filter-bound-cursor" }

// This suite verifies transport contracts, not DB authorization or DTO secrecy.
// Foreign canonical IDs and permission denials are covered by
// convex-tests/organizerDashboardPricingSlice.test.ts with the actual backend.
const cases = [
  {
    operation: "phase-list",
    method: "phaseList",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardPhaseListQuery",
    kind: "query",
    args: { orgId, eventKey: " event-a ", tierKey: " standard " },
    forwarded: { orgId, eventKey: "event-a", tierKey: "standard" },
  },
  {
    operation: "phase-upsert",
    method: "phaseUpsert",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardPhaseUpsertMutation",
    kind: "mutation",
    args: { orgId, eventKey: "event-a", tierKey: "standard", name: " Early Bird ", priceCents: 1500, quota: 100 },
    forwarded: { orgId, eventKey: "event-a", tierKey: "standard", name: "Early Bird", priceCents: 1500, quota: 100 },
  },
  {
    operation: "phase-archive",
    method: "phaseArchive",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardPhaseArchiveMutation",
    kind: "mutation",
    args: { orgId, phaseId: "phase_test" },
    forwarded: { orgId, phaseId: "phase_test" },
  },
  {
    operation: "code-list",
    method: "codeList",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardCodeListQuery",
    kind: "query",
    args: { orgId, eventKey: " event-a ", kind: "rabatt", ...page },
    forwarded: { orgId, eventKey: "event-a", kind: "rabatt", paginationOpts: page },
  },
  {
    operation: "code-create",
    method: "codeCreate",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardCodeCreateMutation",
    kind: "mutation",
    args: {
      orgId,
      eventKey: "event-a",
      kind: "rabatt",
      code: " jazz10 ",
      discountType: "prozent",
      discountValue: 1000,
    },
    forwarded: {
      orgId,
      eventKey: "event-a",
      kind: "rabatt",
      code: "jazz10",
      discountType: "prozent",
      discountValue: 1000,
    },
  },
  {
    operation: "code-create",
    method: "codeCreate",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardCodeCreateMutation",
    kind: "mutation",
    args: { orgId, eventKey: "event-a", kind: "zugang", prefix: " abi- ", count: 5, tierKeys: ["schueler"] },
    forwarded: { orgId, eventKey: "event-a", kind: "zugang", prefix: "abi-", count: 5, tierKeys: ["schueler"] },
  },
  {
    operation: "code-update",
    method: "codeUpdate",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardCodeUpdateMutation",
    kind: "mutation",
    args: { orgId, codeId: "code_test", active: false, maxTickets: 10 },
    forwarded: { orgId, codeId: "code_test", active: false, maxTickets: 10 },
  },
  {
    operation: "code-delete",
    method: "codeDelete",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardCodeDeleteMutation",
    kind: "mutation",
    args: { orgId, codeId: "code_test" },
    forwarded: { orgId, codeId: "code_test" },
  },
  {
    operation: "voucher-list",
    method: "voucherList",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardVoucherListQuery",
    kind: "query",
    args: { orgId, status: "aktiv", ...page },
    forwarded: { orgId, status: "aktiv", paginationOpts: page },
  },
  {
    operation: "voucher-issue",
    method: "voucherIssue",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardVoucherIssueMutation",
    kind: "mutation",
    args: { orgId, initialCents: 5000, validity: "1-jahr", recipientName: " Lea Schneider " },
    forwarded: { orgId, initialCents: 5000, validity: "1-jahr", recipientName: "Lea Schneider" },
  },
  {
    operation: "voucher-redeem",
    method: "voucherRedeem",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardVoucherRedeemMutation",
    kind: "mutation",
    args: { orgId, code: "DANK-1", amountCents: 500, orderRef: "EV-1" },
    forwarded: { orgId, code: "DANK-1", amountCents: 500, orderRef: "EV-1" },
  },
  {
    operation: "voucher-deactivate",
    method: "voucherDeactivate",
    module: "organizerDashboardPricing",
    fn: "organizerDashboardVoucherDeactivateMutation",
    kind: "mutation",
    args: { orgId, voucherId: "voucher_test" },
    forwarded: { orgId, voucherId: "voucher_test" },
  },
  {
    operation: "payout-status-update",
    method: "payoutStatusUpdate",
    module: "organizerDashboardFinance",
    fn: "organizerDashboardPayoutStatusUpdateMutation",
    kind: "mutation",
    args: { orgId, payoutId: "payout_test", status: "ausgezahlt" },
    forwarded: { orgId, payoutId: "payout_test", status: "ausgezahlt" },
  },
] as const satisfies readonly {
  operation: string
  method: keyof OrganizerDashboardClient
  module: string
  fn: string
  kind: string
  args: object
  forwarded: object
}[]
type PricingCase = (typeof cases)[number]

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
function clientCall(sdk: ReturnType<typeof sdkCreate>, method: PricingCase["method"], args: unknown, auth = true) {
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
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "PRICING_TEST_CRED"],
    env: auth ? { PRICING_TEST_CRED: credential } : {},
    stdinText: JSON.stringify(args),
    stdout: (line) => output.push(line),
    backendFromUrl: () => sdk.backend,
  })
  const text = output.join("")
  return { exitCode, text, json: JSON.parse(text) }
}
async function assertForward(entry: PricingCase, args: object, forwarded: object) {
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
async function assertInvalid(entry: PricingCase, args: object) {
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
    test("safe backend failures stay failures using the existing unified catalog fallback", async () => {
      const sdk = sdkCreate(createResultError("pricingAuthorization", "Permission denied"))
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
