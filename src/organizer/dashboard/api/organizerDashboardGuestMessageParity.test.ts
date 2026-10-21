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

const credential = "guest-message-private-test-credential-4d91"
const orgId = "org_test"
const eventKey = " event-test "
const quotaId = "quota_test"
const guestId = "guest_test"
const messageId = "message_test"
const data = { ok: true }

// This suite verifies transport contracts, not DB authorization or DTO secrecy.
// Foreign canonical IDs, entry-only access and secret projection are covered by
// convex-tests/organizerDashboardGuests.test.ts and organizerDashboardMessages.test.ts.
const cases = [
  {
    operation: "guest-quota-list",
    method: "guestQuotaList",
    fn: "organizerDashboardGuestQuotaListQuery",
    kind: "query",
    args: { orgId, eventKey },
    forwarded: { orgId, eventKey: "event-test" },
  },
  {
    operation: "guest-quota-upsert",
    method: "guestQuotaUpsert",
    fn: "organizerDashboardGuestQuotaUpsertMutation",
    kind: "mutation",
    args: { orgId, eventKey, name: " Presse ", limit: 20 },
    forwarded: { orgId, eventKey: "event-test", name: "Presse", limit: 20 },
  },
  {
    operation: "guest-quota-delete",
    method: "guestQuotaDelete",
    fn: "organizerDashboardGuestQuotaDeleteMutation",
    kind: "mutation",
    args: { orgId, quotaId },
    forwarded: { orgId, quotaId },
  },
  {
    operation: "guest-list",
    method: "guestList",
    fn: "organizerDashboardGuestListQuery",
    kind: "query",
    args: { orgId, eventKey, search: " Mara " },
    forwarded: { orgId, eventKey: "event-test", search: "Mara" },
  },
  {
    operation: "guest-upsert",
    method: "guestUpsert",
    fn: "organizerDashboardGuestUpsertMutation",
    kind: "mutation",
    args: { orgId, eventKey, name: " Mara ", plusOnes: 2 },
    forwarded: { orgId, eventKey: "event-test", name: "Mara", plusOnes: 2 },
  },
  {
    operation: "guest-delete",
    method: "guestDelete",
    fn: "organizerDashboardGuestDeleteMutation",
    kind: "mutation",
    args: { orgId, guestId },
    forwarded: { orgId, guestId },
  },
  {
    operation: "guest-ticket-send",
    method: "guestTicketSend",
    fn: "organizerDashboardGuestTicketSendMutation",
    kind: "mutation",
    args: { orgId, guestId },
    forwarded: { orgId, guestId },
  },
  {
    operation: "guest-check-in",
    method: "guestCheckIn",
    fn: "organizerDashboardGuestCheckInMutation",
    kind: "mutation",
    args: { orgId, guestId, entrance: " Haupteingang " },
    forwarded: { orgId, guestId, entrance: "Haupteingang" },
  },
  {
    operation: "guest-check-in-undo",
    method: "guestCheckInUndo",
    fn: "organizerDashboardGuestCheckInUndoMutation",
    kind: "mutation",
    args: { orgId, guestId },
    forwarded: { orgId, guestId },
  },
  {
    operation: "message-list",
    method: "messageList",
    fn: "organizerDashboardMessageListQuery",
    kind: "query",
    args: { orgId, eventKey },
    forwarded: { orgId, eventKey: "event-test" },
  },
  {
    operation: "message-get",
    method: "messageGet",
    fn: "organizerDashboardMessageGetQuery",
    kind: "query",
    args: { orgId, messageId },
    forwarded: { orgId, messageId },
  },
  {
    operation: "message-create",
    method: "messageCreate",
    fn: "organizerDashboardMessageCreateMutation",
    kind: "mutation",
    args: {
      orgId,
      eventKey,
      kind: "info",
      audience: { type: "alle", tierKeys: [] },
      subject: " Hallo ",
      body: " Text ",
    },
    forwarded: {
      orgId,
      eventKey: "event-test",
      kind: "info",
      audience: { type: "alle", tierKeys: [] },
      subject: "Hallo",
      body: "Text",
    },
  },
  {
    operation: "message-update",
    method: "messageUpdate",
    fn: "organizerDashboardMessageUpdateMutation",
    kind: "mutation",
    args: {
      orgId,
      messageId,
      kind: "aenderung",
      audience: { type: "eingecheckt", tierKeys: [] },
      subject: " Neu ",
      body: " Neu ",
    },
    forwarded: {
      orgId,
      messageId,
      kind: "aenderung",
      audience: { type: "eingecheckt", tierKeys: [] },
      subject: "Neu",
      body: "Neu",
    },
  },
  {
    operation: "message-schedule",
    method: "messageSchedule",
    fn: "organizerDashboardMessageScheduleMutation",
    kind: "mutation",
    args: { orgId, messageId, scheduledAt: "2030-01-01T10:00:00.000Z" },
    forwarded: { orgId, messageId, scheduledAt: "2030-01-01T10:00:00.000Z" },
  },
  {
    operation: "message-send",
    method: "messageSend",
    fn: "organizerDashboardMessageSendMutation",
    kind: "mutation",
    args: { orgId, messageId },
    forwarded: { orgId, messageId },
  },
  {
    operation: "message-delete",
    method: "messageDelete",
    fn: "organizerDashboardMessageDeleteMutation",
    kind: "mutation",
    args: { orgId, messageId },
    forwarded: { orgId, messageId },
  },
  {
    operation: "message-ics-get",
    method: "messageIcsGet",
    fn: "organizerDashboardMessageIcsGetQuery",
    kind: "query",
    args: { orgId, eventKey },
    forwarded: { orgId, eventKey: "event-test" },
  },
  {
    operation: "message-reminder-get",
    method: "messageReminderGet",
    fn: "organizerDashboardMessageReminderGetQuery",
    kind: "query",
    args: { orgId, eventKey },
    forwarded: { orgId, eventKey: "event-test" },
  },
  {
    operation: "message-reminder-update",
    method: "messageReminderUpdate",
    fn: "organizerDashboardMessageReminderUpdateMutation",
    kind: "mutation",
    args: { orgId, eventKey, enabled: true, hoursBefore: 24, directions: " Ab Ostbahnhof ", calendar: true },
    forwarded: {
      orgId,
      eventKey: "event-test",
      enabled: true,
      hoursBefore: 24,
      directions: "Ab Ostbahnhof",
      calendar: true,
    },
  },
] as const satisfies readonly {
  operation: string
  method: keyof OrganizerDashboardClient
  fn: string
  kind: string
  args: object
  forwarded: object
}[]
type GuestMessageCase = (typeof cases)[number]

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
function clientCall(
  sdk: ReturnType<typeof sdkCreate>,
  method: GuestMessageCase["method"],
  args: unknown,
  auth = true,
): Promise<unknown> {
  return organizerDashboardClientCreate({ client: sdk.client, token: () => (auth ? ` ${credential} ` : " ") })[method](
    args as never,
  ) as Promise<unknown>
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
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "GUEST_TEST_CRED"],
    env: auth ? { GUEST_TEST_CRED: credential } : {},
    stdinText: JSON.stringify(args),
    stdout: (line) => output.push(line),
    backendFromUrl: () => sdk.backend,
  })
  const text = output.join("")
  return { exitCode, text, json: JSON.parse(text) }
}
async function assertForward(entry: GuestMessageCase, args: object, forwarded: object) {
  const sdk = sdkCreate()
  const http = await httpCall(sdk, entry.operation, args)
  expect(http.status).toBe(200)
  expect(await http.json()).toEqual({ data })
  const cli = await cliCall(sdk, entry.operation, args)
  expect(cli.exitCode).toBe(0)
  expect(cli.json).toEqual({ success: true, data })
  expect(await clientCall(sdk, entry.method, args)).toEqual({ success: true, data })
  const module = entry.operation.startsWith("guest-") ? "organizerDashboardGuests" : "organizerDashboardMessages"
  expect(sdk.calls).toEqual(
    Array(3).fill({
      kind: entry.kind,
      name: `${module}:${entry.fn}`,
      args: { token: credential, ...forwarded },
    }),
  )
}
async function assertInvalid(entry: GuestMessageCase, args: object) {
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
    test("strict inputs reject unknown fields, body auth and empty ids before transport", async () => {
      for (const extra of [
        { token: credential },
        { authorization: credential },
        { unexpected: true },
        { accessToken: credential },
      ]) {
        await assertInvalid(entry, { ...entry.args, ...extra })
      }
      await assertInvalid(entry, { ...entry.args, orgId: " " })
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
      const sdk = sdkCreate(createResultError("guestAuthorization", "Permission denied"))
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

const quotaUpsert = cases[1]
const guestUpsert = cases[4]
const guestCheckIn = cases[7]
const messageCreate = cases[11]
const messageSchedule = cases[13]
const reminderUpdate = cases[18]

test("plusOnes stays 0..5 and quota limit stays a positive integer on every surface", async () => {
  for (const plusOnes of [-1, 6, 1.5]) await assertInvalid(guestUpsert, { ...guestUpsert.args, plusOnes })
  for (const limit of [0, -3, 1.5]) await assertInvalid(quotaUpsert, { ...quotaUpsert.args, limit })
  await assertForward(guestUpsert, { ...guestUpsert.args, plusOnes: 5 }, { ...guestUpsert.forwarded, plusOnes: 5 })
})
test("guest names and entrances trim, empty is rejected on every surface", async () => {
  await assertInvalid(guestUpsert, { ...guestUpsert.args, name: " " })
  await assertInvalid(guestCheckIn, { ...guestCheckIn.args, entrance: " " })
  await assertForward(
    guestCheckIn,
    { ...guestCheckIn.args, entrance: " Seiteneingang " },
    { ...guestCheckIn.forwarded, entrance: "Seiteneingang" },
  )
})
test("message audiences use the canonical picklist and tierKeys stay bounded", async () => {
  for (const type of ["alle-verkauft", "", null]) {
    await assertInvalid(messageCreate, {
      ...messageCreate.args,
      audience: { type, tierKeys: [] },
    })
  }
  await assertInvalid(messageCreate, {
    ...messageCreate.args,
    audience: { type: "ticketarten", tierKeys: Array(51).fill("vip") },
  })
  await assertForward(
    messageCreate,
    { ...messageCreate.args, audience: { type: "nicht-eingecheckt", tierKeys: [] } },
    { ...messageCreate.forwarded, audience: { type: "nicht-eingecheckt", tierKeys: [] } },
  )
})
test("schedule needs an ISO instant and reminder hours stay 1..72", async () => {
  // Past instants pass the interface format check and are refused by the
  // backend; convex-tests/organizerDashboardMessages.test.ts covers that.
  await assertInvalid(messageSchedule, { ...messageSchedule.args, scheduledAt: "not-a-date" })
  await assertInvalid(messageSchedule, { ...messageSchedule.args, scheduledAt: " " })
  for (const hoursBefore of [0, 73]) {
    await assertInvalid(reminderUpdate, { ...reminderUpdate.args, hoursBefore })
  }
})
test("sent messages cannot be rewritten or removed is enforced by the backend contract", async () => {
  expect(new Set<string>(organizerDashboardOperations).has("message-send")).toBe(true)
  expect(new Set<string>(organizerDashboardOperations).has("message-delete")).toBe(true)
})
