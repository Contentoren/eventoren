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

const credential = "orders-private-test-credential-7f42"
const orgId = "org_test"
const orderId = "order_test"
const ticketId = "ticket_test"
const noteId = "note_test"
const scope = { orgId, orderId }
const page = { numItems: 50, cursor: "filter-bound-cursor", endCursor: "filter-bound-end" }
const data = { page: [], isDone: false, continueCursor: "next-filter-bound-cursor" }

// This suite verifies transport contracts, not DB authorization or DTO secrecy.
// Foreign canonical IDs, entry-only access and secret projection are covered by
// convex-tests/organizerDashboardOrders.test.ts with the actual backend.
const cases = [
  {
    operation: "order-list",
    method: "orderList",
    fn: "organizerDashboardOrderListQuery",
    kind: "query",
    args: { orgId, eventKey: " event-test ", status: "paid", search: " Buyer ", ...page },
    forwarded: { orgId, eventKey: "event-test", status: "paid", search: "Buyer", paginationOpts: page },
  },
  {
    operation: "order-get",
    method: "orderGet",
    fn: "organizerDashboardOrderGetQuery",
    kind: "query",
    args: scope,
    forwarded: scope,
  },
  {
    operation: "order-note-create",
    method: "orderNoteCreate",
    fn: "organizerDashboardOrderNoteCreateMutation",
    kind: "mutation",
    args: { ...scope, text: " Internal note " },
    forwarded: { ...scope, text: "Internal note" },
  },
  {
    operation: "order-note-delete",
    method: "orderNoteDelete",
    fn: "organizerDashboardOrderNoteDeleteMutation",
    kind: "mutation",
    args: { ...scope, noteId },
    forwarded: { ...scope, noteId },
  },
  {
    operation: "order-buyer-contact-update",
    method: "orderBuyerContactUpdate",
    fn: "organizerDashboardOrderBuyerContactUpdateMutation",
    kind: "mutation",
    args: { ...scope, givenName: " Buyer ", familyName: "", email: "", phone: "  " },
    forwarded: { ...scope, givenName: "Buyer", familyName: "", email: "", phone: "" },
  },
  {
    operation: "order-participant-update",
    method: "orderParticipantUpdate",
    fn: "organizerDashboardOrderParticipantUpdateMutation",
    kind: "mutation",
    args: { ...scope, ticketId, participantName: " Holder ", participantEmail: "" },
    forwarded: { ...scope, ticketId, participantName: "Holder", participantEmail: "" },
  },
  {
    operation: "order-participant-list",
    method: "orderParticipantList",
    fn: "organizerDashboardOrderParticipantListQuery",
    kind: "query",
    args: { orgId, eventKey: " event-test ", search: " Holder ", ...page },
    forwarded: { orgId, eventKey: "event-test", search: "Holder", paginationOpts: page },
  },
] as const satisfies readonly {
  operation: string
  method: keyof OrganizerDashboardClient
  fn: string
  kind: string
  args: object
  forwarded: object
}[]
type OrderCase = (typeof cases)[number]

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
function clientCall(sdk: ReturnType<typeof sdkCreate>, method: OrderCase["method"], args: unknown, auth = true) {
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
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "ORDER_TEST_CRED"],
    env: auth ? { ORDER_TEST_CRED: credential } : {},
    stdinText: JSON.stringify(args),
    stdout: (line) => output.push(line),
    backendFromUrl: () => sdk.backend,
  })
  const text = output.join("")
  return { exitCode, text, json: JSON.parse(text) }
}
async function assertForward(entry: OrderCase, args: object, forwarded: object) {
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
      name: "organizerDashboardOrders:" + entry.fn,
      args: { token: credential, ...forwarded },
    }),
  )
}
async function assertInvalid(entry: OrderCase, args: object) {
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
      const sdk = sdkCreate(createResultError("orderAuthorization", "Permission denied"))
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

const list = cases[0]
const get = cases[1]
const noteCreate = cases[2]
const noteDelete = cases[3]
const contact = cases[4]
const holder = cases[5]
const participants = cases[6]

for (const entry of [list, participants]) {
  test(
    entry.operation + " preserves cursors opaquely and defaults only pagination, with null endCursor omitted",
    async () => {
      const filter = entry === participants ? { orgId, eventKey: "event-test" } : { orgId }
      await assertForward(
        entry,
        { ...filter, endCursor: null },
        { ...filter, paginationOpts: { numItems: 25, cursor: null } },
      )
    },
  )
  test(entry.operation + " enforces integer page size 1..50 and shared search/event lengths locally", async () => {
    for (const numItems of [0, -1, 1.5, 51, "25", null]) await assertInvalid(entry, { ...entry.args, numItems })
    for (const extra of [
      { search: "x".repeat(101) },
      { eventKey: "x".repeat(161) },
      { eventKey: " " },
      { cursor: 2 },
    ]) {
      await assertInvalid(entry, { ...entry.args, ...extra })
    }
  })
}
test("order statuses use the canonical picklist, never event/payment statuses", async () => {
  for (const status of ["published", "refunded", "PAID", "", null]) await assertInvalid(list, { ...list.args, status })
  for (const status of [
    "reserved",
    "checkout_created",
    "paid",
    "failed",
    "expired",
    "released",
    "paid_inventory_conflict",
  ]) {
    await assertForward(list, { orgId, status }, { orgId, status, paginationOpts: { numItems: 25, cursor: null } })
  }
})
test("required scope IDs and participant event are not silently filled", async () => {
  for (const entry of cases) await assertInvalid(entry, { ...entry.args, orgId: " " })
  await assertInvalid(get, { orgId })
  await assertInvalid(noteDelete, scope)
  await assertInvalid(holder, scope)
  await assertInvalid(participants, { orgId })
  // No order-read selector or role claim is required/accepted for this query.
  await assertInvalid(participants, { ...participants.args, orderId })
})
test("note text uses the shared trimmed 1..1000 constraint", async () => {
  for (const text of [" ", "x".repeat(1001), null, 123]) await assertInvalid(noteCreate, { ...scope, text })
  await assertForward(noteCreate, { ...scope, text: "x".repeat(1000) }, { ...scope, text: "x".repeat(1000) })
})
test("contact omission is not turned into clears; explicit empty strings and normalization survive every surface", async () => {
  for (const fields of [
    {},
    { email: "" },
    { givenName: " ", familyName: "", phone: "" },
    { email: "buyer@example.org" },
  ]) {
    const normalized = "givenName" in fields ? { givenName: "", familyName: "", phone: "" } : fields
    await assertForward(contact, { ...scope, ...fields }, { ...scope, ...normalized })
  }
  for (const fields of [
    { givenName: "x".repeat(121) },
    { familyName: "x".repeat(121) },
    { phone: "x".repeat(81) },
    { email: "bad" },
    { email: "x".repeat(255) },
    { email: null },
    { email: " " },
  ]) {
    await assertInvalid(contact, { ...scope, ...fields })
  }
})
test("holder omission and empty clears are exact, with shared 240-character and email validation", async () => {
  for (const fields of [
    {},
    { participantEmail: "" },
    { participantName: " " },
    { participantEmail: "holder@example.org" },
  ]) {
    const normalized = "participantName" in fields ? { participantName: "" } : fields
    await assertForward(holder, { ...scope, ticketId, ...fields }, { ...scope, ticketId, ...normalized })
  }
  for (const fields of [
    { participantName: "x".repeat(241) },
    { participantEmail: "bad" },
    { participantEmail: "x".repeat(255) },
    { participantEmail: null },
    { participantEmail: " " },
  ]) {
    await assertInvalid(holder, { ...scope, ticketId, ...fields })
  }
})
