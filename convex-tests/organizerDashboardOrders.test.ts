/// <reference types="vite/client" />
import { type ApiFromModules, type FunctionReturnType, makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import schema from "../convex/schema.ts"
import * as operations from "../convex/organizerDashboardOrders.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = { ...import.meta.glob("../convex/**/*.ts") }
type Api = ApiFromModules<{ organizerDashboardOrders: typeof operations }>["organizerDashboardOrders"]
function ref<K extends keyof Api>(key: K): Api[K] {
  return makeFunctionReference(`organizerDashboardOrders:${key}`) as Api[K]
}
const list = ref("organizerDashboardOrderListQuery")
const detail = ref("organizerDashboardOrderGetQuery")
const participants = ref("organizerDashboardOrderParticipantListQuery")
const buyer = ref("organizerDashboardOrderBuyerContactUpdateMutation")
const holder = ref("organizerDashboardOrderParticipantUpdateMutation")
const addNote = ref("organizerDashboardOrderNoteCreateMutation")
const deleteNote = ref("organizerDashboardOrderNoteDeleteMutation")
const now = "2026-10-01T10:00:00.000Z"
const roles = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"] as const
const secret = "orders-test-secret-only"
afterEach(() => vi.unstubAllEnvs())

async function seed() {
  vi.stubEnv("AUTH_SECRET", secret)
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", { orgHandle: "a", name: "A", createdAt: now, updatedAt: now })
    const otherOrg = await ctx.db.insert("orgs", { orgHandle: "b", name: "B", createdAt: now, updatedAt: now })
    const users = {} as Record<(typeof roles)[number], Awaited<ReturnType<typeof ctx.db.insert<"users">>>>
    for (const role of roles) {
      const userId = await ctx.db.insert("users", { name: role, role: "customer", createdAt: now, updatedAt: now })
      users[role] = userId
      await ctx.db.insert("orgMembers", {
        userId,
        orgId,
        orgHandle: "a",
        role: "member",
        organizerRole: role,
        invitedBy: userId,
        createdAt: now,
        updatedAt: now,
      })
    }
    const globalAdmin = await ctx.db.insert("users", {
      name: "Global admin",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    for (const id of [orgId, otherOrg])
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId: id,
        status: "aktiv",
        profile: { name: "Org", slug: String(id), kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        configurationConfirmed: true,
        createdAt: now,
        updatedAt: now,
      })
    const eventData = {
      title: "Testevent",
      subtitle: "",
      description: "",
      category: "festival",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Ort",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published" as const,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }
    const eventId = await ctx.db.insert("catalogEvents", { ...eventData, orgId, eventKey: "event-a" })
    await ctx.db.insert("catalogEvents", { ...eventData, orgId: otherOrg, eventKey: "event-b" })
    const orderData = {
      checkoutKey: "SECRET_checkoutKey",
      ownerUserId: users.inhaber,
      guestAccessDigest: "SECRET_guestDigest",
      emailAccessDigest: "SECRET_emailDigest",
      customerEmail: "historical@example.org",
      customerGivenName: "Historical",
      customerFamilyName: "Buyer",
      customerPhone: "123",
      customerAddress: "Old address",
      contactSnapshotJson: '{"secret":"SECRET_contactSnapshot"}',
      billingDetailsJson: '{"secret":"SECRET_billing"}',
      checkoutContextJson: '{"secret":"SECRET_commercial"}',
      eventKey: "event-a",
      eventTitle: "Testevent",
      eventSubtitle: "",
      eventDescription: "SECRET_description",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Ort",
      city: "Berlin",
      address: "",
      organizer: "Org",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 1000,
      feeCents: 100,
      totalCents: 1100,
      orgId,
      paymentReference: "SECRET_payment",
      stripeMode: "test" as const,
      billingOrderReference: "SECRET_billingRef",
      checkoutUrl: "https://SECRET_checkout",
      stripeSessionId: "SECRET_session",
      stripePaymentIntentId: "SECRET_intent",
      status: "paid" as const,
      paymentStatus: "paid" as const,
      reservationExpiresAt: 1,
      createdAt: now,
      updatedAt: now,
      bookingNumber: 11,
    }
    const orderId = await ctx.db.insert("ticketOrders", orderData)
    const otherOrderId = await ctx.db.insert("ticketOrders", {
      ...orderData,
      eventKey: "event-b",
      orgId: otherOrg,
      bookingNumber: 22,
    })
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: "Standard",
      description: "",
      priceCents: 1000,
      feeCents: 100,
      capacity: 100,
      reserved: 0,
      sold: 1,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId,
      eventKey: "event-a",
      tierKey: "standard",
      tierName: "Standard",
      tierDescription: "",
      quantity: 1,
      priceCents: 1000,
      feeCents: 100,
      createdAt: now,
    })
    const ticketData = {
      orderId,
      sequence: 1,
      ownerUserId: users.inhaber,
      guestAccessDigest: "SECRET_ticketDigest",
      code: "SECRET_ticketCode",
      eventKey: "event-a",
      eventTitle: "Testevent",
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Ort",
      city: "Berlin",
      address: "",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 1000,
      feeCents: 100,
      participantName: "Holder",
      checkedInAt: now,
      issuedAt: now,
    }
    const ticketId = await ctx.db.insert("ticketIssued", ticketData)
    const otherTicketId = await ctx.db.insert("ticketIssued", {
      ...ticketData,
      orderId: otherOrderId,
      eventKey: "event-b",
      code: "SECRET_otherCode",
    })
    return {
      orgId,
      otherOrg,
      users,
      globalAdmin,
      orderId,
      otherOrderId,
      ticketId,
      otherTicketId,
      eventId,
      orderData,
      ticketData,
    }
  })
  const tokens = {} as Record<(typeof roles)[number], string>
  for (const role of roles) tokens[role] = await testAuthSessionTokenCreate(t, ids.users[role], secret)
  const globalAdminToken = await testAuthSessionTokenCreate(t, ids.globalAdmin, secret)
  return { t, ...ids, tokens, globalAdminToken }
}

for (const role of roles)
  test(`${role}: explicit order, note, contact, holder and participant policy`, async () => {
    const s = await seed(),
      token = s.tokens[role],
      base = { token, orgId: s.orgId },
      order = { ...base, orderId: s.orderId }
    const allowed = role !== "einlass"
    expect((await s.t.query(list, { ...base, paginationOpts: { numItems: 10, cursor: null } })).success).toBe(allowed)
    expect((await s.t.query(detail, order)).success).toBe(allowed)
    const existing = await s.t.run((ctx) =>
      ctx.db.insert("organizerDashboardOrderNotes", {
        orgId: s.orgId,
        orderId: s.orderId,
        eventKey: "event-a",
        authorUserId: s.users.inhaber,
        text: "Existing",
        createdAt: now,
      }),
    )
    expect((await s.t.mutation(deleteNote, { ...order, noteId: existing })).success).toBe(allowed)
    const added = await s.t.mutation(addNote, { ...order, text: "Interne Notiz" })
    expect(added.success).toBe(allowed)
    if (added.success)
      expect((await s.t.mutation(deleteNote, { ...order, noteId: added.data.noteId })).success).toBe(true)
    expect((await s.t.mutation(buyer, { ...order, email: "operational@example.org" })).success).toBe(allowed)
    expect(
      (await s.t.mutation(holder, { ...order, ticketId: s.ticketId, participantName: "New holder" })).success,
    ).toBe(allowed)
    const result = await s.t.query(participants, {
      ...base,
      eventKey: "event-a",
      paginationOpts: { numItems: 10, cursor: null },
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.page).toHaveLength(1)
    expect(Object.keys(result.data.page[0]!).sort()).toEqual(
      [
        "ticketId",
        "sequence",
        "tierName",
        "participantName",
        "participantEmail",
        "checkedInAt",
        "cancelled",
        "issuedAt",
      ].sort(),
    )
    expect(JSON.stringify(result)).not.toMatch(
      /SECRET|historical@example|totalCents|buyer|orderId|priceCents|checkout|Digest/,
    )
  })

test("no global admin bypass; every operation rejects nonmembers, cross-org IDs and ticket/order mismatches", async () => {
  const s = await seed(),
    base = { token: s.tokens.inhaber, orgId: s.orgId },
    order = { ...base, orderId: s.otherOrderId }
  expect(
    (
      await s.t.query(list, {
        orgId: s.orgId,
        token: s.globalAdminToken,
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).success,
  ).toBe(false)
  expect((await s.t.query(detail, order)).success).toBe(false)
  expect((await s.t.mutation(buyer, { ...order, email: "attack@example.org" })).success).toBe(false)
  expect(
    (await s.t.mutation(holder, { ...base, orderId: s.orderId, ticketId: s.otherTicketId, participantName: "Attack" }))
      .success,
  ).toBe(false)
  expect((await s.t.mutation(addNote, { ...order, text: "Attack" })).success).toBe(false)
  expect(
    (await s.t.query(list, { ...base, eventKey: "event-b", paginationOpts: { numItems: 10, cursor: null } })).success,
  ).toBe(false)
  expect(
    (await s.t.query(participants, { ...base, eventKey: "event-b", paginationOpts: { numItems: 10, cursor: null } }))
      .success,
  ).toBe(false)
  const ownNote = await s.t.mutation(addNote, { ...base, orderId: s.orderId, text: "Own note" })
  expect(ownNote.success).toBe(true)
  if (!ownNote.success) return
  expect((await s.t.mutation(deleteNote, { ...order, noteId: ownNote.data.noteId })).success).toBe(false)
  const newOrder = await s.t.run((ctx) => ctx.db.insert("ticketOrders", { ...s.orderData, bookingNumber: 99 }))
  expect((await s.t.mutation(deleteNote, { ...base, orderId: newOrder, noteId: ownNote.data.noteId })).success).toBe(
    false,
  )
})

test("canonical event ownership and mandatory order snapshots fail closed for all reads and writes", async () => {
  const s = await seed(),
    base = { token: s.tokens.inhaber, orgId: s.orgId },
    order = { ...base, orderId: s.orderId }
  await s.t.run((ctx) => ctx.db.patch("catalogEvents", s.eventId, { orgId: s.otherOrg }))
  expect((await s.t.query(detail, order)).success).toBe(false)
  expect((await s.t.mutation(buyer, { ...order, givenName: "Attack" })).success).toBe(false)
  expect((await s.t.mutation(holder, { ...order, ticketId: s.ticketId, participantName: "Attack" })).success).toBe(
    false,
  )
  expect((await s.t.mutation(addNote, { ...order, text: "Attack" })).success).toBe(false)
  const page = await s.t.query(list, { ...base, paginationOpts: { numItems: 10, cursor: null } })
  expect(page.success && page.data.page).toEqual([])
  expect(
    (await s.t.query(participants, { ...base, eventKey: "event-a", paginationOpts: { numItems: 10, cursor: null } }))
      .success,
  ).toBe(false)
  await s.t.run(async (ctx) => {
    await ctx.db.patch("catalogEvents", s.eventId, { orgId: s.orgId })
    await ctx.db.patch("ticketOrders", s.orderId, { orgId: undefined })
  })
  expect((await s.t.query(detail, order)).success).toBe(false)
  const p = await s.t.query(participants, {
    ...base,
    eventKey: "event-a",
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(p.success && p.data.page).toEqual([])
})

test("order DTOs allowlist fields and never expose secrets, raw snapshots or provider identifiers", async () => {
  const s = await seed(),
    base = { token: s.tokens.finanzen, orgId: s.orgId }
  const a = await s.t.query(list, { ...base, paginationOpts: { numItems: 10, cursor: null } })
  const b = await s.t.query(detail, { ...base, orderId: s.orderId })
  expect(a.success).toBe(true)
  expect(b.success).toBe(true)
  expect(JSON.stringify([a, b])).not.toMatch(
    /SECRET|guestAccess|emailAccess|SnapshotJson|billingDetails|checkout|stripe|paymentReference|ownerUserId|billingOrderReference|accessToken|cancellation/,
  )
  if (!b.success) return
  expect(b.data.totalCents).toBe(1100)
  expect(b.data.status).toBe("paid")
  expect(b.data.historicalContact.email).toBe("historical@example.org")
  expect(b.data.lines).toHaveLength(1)
})

test("operational contact is a partial additive override; history, access, prices and statuses never change", async () => {
  const s = await seed(),
    order = { orgId: s.orgId, token: s.tokens.eventmanager, orderId: s.orderId }
  const before = await s.t.run((ctx) => ctx.db.get("ticketOrders", s.orderId))
  expect((await s.t.mutation(buyer, { ...order, email: "ops@example.org", givenName: " Ops " })).success).toBe(true)
  expect((await s.t.mutation(buyer, { ...order, phone: "456" })).success).toBe(true)
  const after = await s.t.run((ctx) => ctx.db.get("ticketOrders", s.orderId))
  const { operationalContact, ...rest } = after!
  expect(rest).toEqual(before)
  expect(operationalContact).toMatchObject({
    email: "ops@example.org",
    givenName: "Ops",
    phone: "456",
    updatedByUserId: s.users.eventmanager,
  })
  expect(operationalContact?.updatedAt).toMatch(/Z$/)
  expect((await s.t.mutation(buyer, { ...order, email: "" })).success).toBe(true)
  const result = await s.t.query(detail, order)
  expect(result.success && result.data.buyer.email).toBe("historical@example.org")
  for (const input of [{ email: "bad-address" }, { phone: "x".repeat(81) }, {}])
    expect((await s.t.mutation(buyer, { ...order, ...input })).success).toBe(false)
})

test("holder labels update without changing entitlement, ticket code, price, check-in or order evidence", async () => {
  const s = await seed(),
    order = { orgId: s.orgId, token: s.tokens.inhaber, orderId: s.orderId }
  const before = await s.t.run((ctx) => ctx.db.get("ticketIssued", s.ticketId))
  const orderBefore = await s.t.run((ctx) => ctx.db.get("ticketOrders", s.orderId))
  const updated = await s.t.mutation(holder, {
    ...order,
    ticketId: s.ticketId,
    participantName: " New Name ",
    participantEmail: "label@example.org",
  })
  expect(updated.success).toBe(true)
  const after = await s.t.run((ctx) => ctx.db.get("ticketIssued", s.ticketId))
  expect(after).toEqual({ ...before, participantName: "New Name", participantEmail: "label@example.org" })
  expect(await s.t.run((ctx) => ctx.db.get("ticketOrders", s.orderId))).toEqual(orderBefore)
  expect((await s.t.mutation(holder, { ...order, ticketId: s.ticketId, participantEmail: "bad" })).success).toBe(false)
  expect(
    (await s.t.mutation(holder, { ...order, ticketId: s.ticketId, participantEmail: "", participantName: "" })).success,
  ).toBe(true)
  const cleared = await s.t.run((ctx) => ctx.db.get("ticketIssued", s.ticketId))
  expect(cleared?.participantName).toBeUndefined()
  expect(cleared?.participantEmail).toBeUndefined()
})

test("notes validate content, use session authors, delete only matching notes and keep append-only audit", async () => {
  const s = await seed(),
    order = { orgId: s.orgId, token: s.tokens.admin, orderId: s.orderId }
  for (const text of ["   ", "x".repeat(1001)])
    expect((await s.t.mutation(addNote, { ...order, text })).success).toBe(false)
  const note = await s.t.mutation(addNote, { ...order, text: " Internal only " })
  expect(note.success).toBe(true)
  if (!note.success) return
  const stored = await s.t.run((ctx) => ctx.db.query("organizerDashboardOrderNotes").first())
  expect(stored).toMatchObject({
    text: "Internal only",
    authorUserId: s.users.admin,
    orgId: s.orgId,
    orderId: s.orderId,
  })
  const result = await s.t.query(detail, order)
  expect(result.success && result.data.notes[0]?.text).toBe("Internal only")
  expect((await s.t.mutation(deleteNote, { ...order, noteId: note.data.noteId })).success).toBe(true)
  expect((await s.t.mutation(deleteNote, { ...order, noteId: note.data.noteId })).success).toBe(false)
  const audit = await s.t.run((ctx) => ctx.db.query("organizerDashboardOrderAudit").take(10))
  expect(audit.map((a) => a.action)).toEqual(["note_added", "note_deleted"])
  expect(audit.every((a) => a.actorUserId === s.users.admin && a.at.endsWith("Z"))).toBe(true)
  expect(JSON.stringify(audit)).not.toContain("Internal only")
})

test("bounded order/participant cursors page without duplicates and bind filters, org, user and query kind", async () => {
  const s = await seed(),
    base = { orgId: s.orgId, token: s.tokens.inhaber }
  await s.t.run(async (ctx) => {
    for (let i = 2; i <= 56; i++) {
      const orderId = await ctx.db.insert("ticketOrders", {
        ...s.orderData,
        bookingNumber: i,
        createdAt: `2026-10-01T10:00:${String(i).padStart(2, "0")}.000Z`,
      })
      await ctx.db.insert("ticketIssued", { ...s.ticketData, orderId, sequence: i, code: `SECRET_${i}` })
    }
  })
  const seenOrders: string[] = [],
    seenTickets: string[] = []
  for (const kind of ["orders", "participants"] as const) {
    let cursor: string | null = null
    for (let i = 0; i < 10; i++) {
      const result: FunctionReturnType<typeof list> | FunctionReturnType<typeof participants> =
        kind === "orders"
          ? await s.t.query(list, { ...base, paginationOpts: { numItems: 13, cursor } })
          : await s.t.query(participants, { ...base, eventKey: "event-a", paginationOpts: { numItems: 13, cursor } })
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.page.length).toBeLessThanOrEqual(13)
      for (const item of result.data.page) {
        if ("orderId" in item) seenOrders.push(item.orderId)
        if ("ticketId" in item) seenTickets.push(item.ticketId)
      }
      if (result.data.isDone) break
      cursor = result.data.continueCursor
    }
  }
  expect(new Set(seenOrders).size).toBe(56)
  expect(seenOrders).toHaveLength(56)
  expect(new Set(seenTickets).size).toBe(56)
  expect(seenTickets).toHaveLength(56)
  const first = await s.t.query(list, { ...base, paginationOpts: { numItems: 1, cursor: null } })
  expect(first.success).toBe(true)
  if (!first.success) return
  const opts = { numItems: 1, cursor: first.data.continueCursor }
  const altered = JSON.parse(first.data.continueCursor)
  altered.sourceCursor = "invalid-native-cursor"
  expect(
    (await s.t.query(list, { ...base, paginationOpts: { numItems: 1, cursor: JSON.stringify(altered) } })).success,
  ).toBe(false)
  expect(
    (
      await s.t.query(list, {
        ...base,
        search: "wrong-scope",
        paginationOpts: { numItems: 1, cursor: null, endCursor: first.data.continueCursor },
      })
    ).success,
  ).toBe(false)
  for (const changed of [
    { search: "different" },
    { status: "paid" as const },
    { eventKey: "event-a" },
    { token: s.tokens.admin },
    { orgId: s.otherOrg },
  ]) {
    expect((await s.t.query(list, { ...base, ...changed, paginationOpts: opts })).success).toBe(false)
  }
  expect((await s.t.query(participants, { ...base, eventKey: "event-a", paginationOpts: opts })).success).toBe(false)
  expect((await s.t.query(list, { ...base, paginationOpts: { numItems: 1, cursor: "invalid" } })).success).toBe(false)
  expect((await s.t.query(list, { ...base, paginationOpts: { numItems: 51, cursor: null } })).success).toBe(false)
  const filtered = await s.t.query(list, { ...base, search: "no-match", paginationOpts: { numItems: 1, cursor: null } })
  expect(filtered.success && filtered.data.page).toEqual([])
  expect(filtered.success && filtered.data.isDone).toBe(false)
  const emptyParticipants = await s.t.query(participants, {
    ...base,
    eventKey: "event-a",
    search: "no-match",
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(emptyParticipants.success && emptyParticipants.data.page).toEqual([])
  expect(emptyParticipants.success && emptyParticipants.data.isDone).toBe(false)
})

test("detail reads cap children and honestly flag truncated notes and tickets", async () => {
  const s = await seed(),
    order = { orgId: s.orgId, token: s.tokens.inhaber, orderId: s.orderId }
  await s.t.run(async (ctx) => {
    for (let i = 2; i <= 52; i++)
      await ctx.db.insert("ticketIssued", { ...s.ticketData, sequence: i, code: `SECRET_${i}` })
    for (let i = 1; i <= 52; i++)
      await ctx.db.insert("organizerDashboardOrderNotes", {
        orgId: s.orgId,
        orderId: s.orderId,
        eventKey: "event-a",
        authorUserId: s.users.admin,
        text: `Note ${i}`,
        createdAt: now,
      })
  })
  const result = await s.t.query(detail, order)
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.tickets).toHaveLength(50)
  expect(result.data.notes).toHaveLength(50)
  expect(result.data.truncated).toEqual({ lines: false, tickets: true, notes: true })
})
