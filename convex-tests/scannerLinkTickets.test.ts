/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc, Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "scanner-link-tickets-secret"
process.env.AUTH_SECRET = authSecret
const page = { numItems: 1, cursor: null }
type EventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">
type OrderInsert = Omit<Doc<"ticketOrders">, "_id" | "_creationTime">

function eventInsert(eventKey: string): EventInsert {
  return {
    eventKey,
    title: `Event ${eventKey}`,
    subtitle: "private subtitle",
    description: "private description",
    category: "concert",
    startsAt: "2026-10-01T18:00:00Z",
    endsAt: "2026-10-01T22:00:00Z",
    doorsAt: "2026-10-01T17:00:00Z",
    venue: "Hall",
    city: "Berlin",
    address: "Road 1",
    organizer: "Org",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status: "published",
    catalogVersion: 1,
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  }
}

function orderInsert(eventKey: string, checkoutKey: string, paid = true): OrderInsert {
  return {
    checkoutKey,
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    contactSnapshotJson: "{}",
    eventKey,
    eventTitle: eventKey,
    eventSubtitle: "",
    eventDescription: "",
    eventStartsAt: "2026-10-01T18:00:00Z",
    eventEndsAt: "2026-10-01T22:00:00Z",
    eventDoorsAt: "2026-10-01T17:00:00Z",
    venue: "Hall",
    city: "Berlin",
    address: "Road 1",
    organizer: "Org",
    imageUrl: "",
    imageAlt: "",
    catalogVersion: 1,
    subtotalCents: 1000,
    feeCents: 0,
    totalCents: 1000,
    checkoutContextJson: "{}",
    paymentReference: checkoutKey,
    stripeMode: "test",
    status: paid ? "paid" : "reserved",
    paymentStatus: paid ? "paid" : "pending",
    reservationExpiresAt: Date.now(),
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  }
}

async function setup() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    await ctx.db.insert("catalogEvents", eventInsert("one"))
    await ctx.db.insert("catalogEvents", eventInsert("two"))
    const userId = await ctx.db.insert("users", {
      name: "Staff",
      role: "organizer",
      organizerInvitedAt: "2026-09-01T00:00:00Z",
      createdAt: "2026-09-01",
      updatedAt: "2026-09-01",
    })
    const parentId = await ctx.db.insert("scannerLinks", {
      code: "a".repeat(64),
      name: "Lead",
      role: "organizer",
      eventKeys: ["one", "two"],
      createdByUserId: userId,
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now(),
    })
    const helperId = await ctx.db.insert("scannerLinks", {
      code: "b".repeat(64),
      name: "Gate volunteer",
      role: "helper",
      eventKeys: ["one"],
      parentId,
      expiresAt: Date.now() + 3600000,
      createdAt: Date.now(),
    })
    const orderId = await ctx.db.insert("ticketOrders", orderInsert("one", "ORDER-ONE"))
    const unpaidId = await ctx.db.insert("ticketOrders", orderInsert("one", "ORDER-UNPAID", false))
    const foreignOrderId = await ctx.db.insert("ticketOrders", orderInsert("two", "ORDER-TWO"))
    const ticket = (orderId: Id<"ticketOrders">, eventKey: string, code: string, sequence: number) => ({
      orderId,
      eventKey,
      code,
      sequence,
      eventTitle: eventKey,
      eventStartsAt: "2026-10-01T18:00:00Z",
      eventDoorsAt: "2026-10-01T17:00:00Z",
      venue: "Hall",
      city: "Berlin",
      address: "Road 1",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 1000,
      feeCents: 0,
      participantName: "Grace Hopper",
      issuedAt: "2026-09-01T00:00:00Z",
    })
    const firstId = await ctx.db.insert("ticketIssued", ticket(orderId, "one", "TKT-ONE", 1))
    const secondId = await ctx.db.insert("ticketIssued", ticket(orderId, "one", "TKT-SECOND", 2))
    await ctx.db.insert("ticketIssued", ticket(orderId, "one", "TKT-AMBIGUOUS", 3))
    await ctx.db.insert("ticketIssued", ticket(orderId, "one", "TKT-AMBIGUOUS", 4))
    const unpaidTicketId = await ctx.db.insert("ticketIssued", ticket(unpaidId, "one", "TKT-UNPAID", 7))
    const cancelledId = await ctx.db.insert("ticketIssued", {
      ...ticket(orderId, "one", "TKT-CANCELLED", 5),
      cancelled: true,
    })
    const foreignId = await ctx.db.insert("ticketIssued", ticket(foreignOrderId, "two", "TKT-TWO", 1))
    const badOrderId = await ctx.db.insert("ticketIssued", ticket(foreignOrderId, "one", "TKT-MISMATCH", 6))
    return { parentId, helperId, firstId, secondId, unpaidTicketId, cancelledId, foreignId, badOrderId }
  })
  return { t, ids, code: "b".repeat(64), parentCode: "a".repeat(64) }
}

test("bearer link lists only scoped published events and searches/paginates tickets without leaking other event details", async () => {
  const { t, ids, code, parentCode } = await setup()
  const events = await t.query(api.scannerLinks.scannerLinkEventListQuery, { code })
  expect(events).toMatchObject({ success: true, data: [{ eventKey: "one", title: "Event one" }] })
  expect(JSON.stringify(events)).not.toContain("private description")
  expect((await t.query(api.scannerLinks.scannerLinkEventGetQuery, { code, eventKey: "two" })).success).toBe(false)
  const first = await t.query(api.scannerLinks.scannerLinkEventTicketListQuery, {
    code,
    eventKey: "one",
    paginationOpts: page,
  })
  expect(first).toMatchObject({ success: true, data: { page: [{ id: ids.firstId, participantName: "Grace Hopper" }] } })
  if (!first.success) return
  const second = await t.query(api.scannerLinks.scannerLinkEventTicketListQuery, {
    code,
    eventKey: "one",
    paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
  })
  expect(second).toMatchObject({ success: true, data: { page: [{ id: ids.secondId }] } })
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkEventTicketListQuery, {
        code,
        eventKey: "two",
        paginationOpts: page,
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkEventTicketListQuery, {
        code: parentCode,
        eventKey: "one",
        paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
      })
    ).success,
  ).toBe(false)
  const searched = await t.query(api.scannerLinks.scannerLinkEventTicketListQuery, {
    code,
    eventKey: "one",
    search: "lovelace",
    paginationOpts: page,
  })
  expect(searched).toMatchObject({ success: true, data: { page: [{ buyerName: "Ada Lovelace" }] } })
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkEventTicketListQuery, {
        code,
        eventKey: "one",
        search: "hopper",
        paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkEventTicketGetQuery, {
        code,
        eventKey: "one",
        ticketId: ids.foreignId,
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkEventTicketGetQuery, {
        code,
        eventKey: "one",
        ticketId: ids.badOrderId,
      })
    ).success,
  ).toBe(false)
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkTicketCheckInHistoryPaginatedQuery, {
        code,
        eventKey: "one",
        ticketId: ids.foreignId,
        cursor: null,
      })
    ).success,
  ).toBe(false)
})

test("every public endpoint rejects invalid, expired, revoked, parent-invalid, or unpublished access", async () => {
  const { t, ids, code } = await setup()
  const request = async (linkCode: string) => [
    await t.query(api.scannerLinks.scannerLinkEventListQuery, { code: linkCode }),
    await t.query(api.scannerLinks.scannerLinkEventGetQuery, { code: linkCode, eventKey: "one" }),
    await t.query(api.scannerLinks.scannerLinkEventTicketListQuery, {
      code: linkCode,
      eventKey: "one",
      paginationOpts: page,
    }),
    await t.query(api.scannerLinks.scannerLinkEventTicketGetQuery, {
      code: linkCode,
      eventKey: "one",
      ticketId: ids.firstId,
    }),
    await t.query(api.scannerLinks.scannerLinkTicketCheckInHistoryPaginatedQuery, {
      code: linkCode,
      eventKey: "one",
      ticketId: ids.firstId,
      cursor: null,
    }),
    await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
      code: linkCode,
      eventKey: "one",
      ticketId: ids.firstId,
    }),
  ]
  expect((await request("invalid")).every((result) => !result.success)).toBe(true)
  for (const [id, patch] of [
    [ids.helperId, { expiresAt: Date.now() - 1 }],
    [ids.helperId, { revokedAt: Date.now() }],
    [ids.parentId, { expiresAt: Date.now() - 1 }],
    [ids.parentId, { revokedAt: Date.now() }],
    [ids.parentId, { eventKeys: ["two"] }],
  ] as const) {
    const previous = await t.run(async (ctx) => {
      const value = await ctx.db.get(id)
      await ctx.db.patch("scannerLinks", id, patch)
      return value
    })
    expect((await request(code)).every((result) => !result.success)).toBe(true)
    if (previous) await t.run((ctx) => ctx.db.replace("scannerLinks", id, previous))
  }
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "one"))
      .unique()
    if (event) await ctx.db.patch("catalogEvents", event._id, { status: "draft" })
  })
  const unpublished = await request(code)
  expect(unpublished.slice(1).every((result) => !result.success)).toBe(true)
  expect(unpublished[0]).toMatchObject({ success: true, data: [] })
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "one"))
      .unique()
    if (event)
      await ctx.db.patch("catalogEvents", event._id, { status: "published", deletedAt: "2026-09-26T00:00:00Z" })
  })
  expect((await request(code)).slice(1).every((result) => !result.success)).toBe(true)
})

test("link check-in preserves invalid target, wrong event, unpaid, cancelled and duplicate safeguards without foreign metadata", async () => {
  const { t, ids, code } = await setup()
  const check = (target: { ticketCode?: string; ticketId?: Id<"ticketIssued"> }, eventKey = "one") =>
    t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, { code, eventKey, ...target })
  for (const [target, errorCode] of [
    [{}, "organizer.check-in.invalid-target"],
    [{ ticketCode: " " }, "organizer.check-in.invalid-code"],
    [{ ticketCode: "ORDER-ONE" }, "organizer.check-in.order-code-not-accepted"],
    [{ ticketCode: "TKT-AMBIGUOUS" }, "organizer.check-in.ambiguous-ticket-code"],
    [{ ticketCode: "UNKNOWN" }, "organizer.check-in.unknown-ticket"],
    [{ ticketCode: "TKT-TWO" }, "organizer.check-in.wrong-event"],
    [{ ticketId: ids.badOrderId }, "organizer.check-in.wrong-event"],
    [{ ticketId: ids.unpaidTicketId }, "organizer.check-in.unpaid"],
    [{ ticketId: ids.cancelledId }, "organizer.check-in.cancelled"],
  ] as const) {
    const result = await check(target)
    expect(result).toMatchObject({ success: false, code: errorCode })
    if (errorCode === "organizer.check-in.wrong-event") expect(JSON.stringify(result)).not.toContain("two")
  }
  expect((await check({ ticketId: ids.firstId }, "two")).success).toBe(false)
  const results = await Promise.all([check({ ticketId: ids.firstId }), check({ ticketCode: "TKT-ONE" })])
  expect(results.filter((result) => result.success)).toHaveLength(1)
  expect(results.filter((result) => !result.success && result.code === "organizer.check-in.duplicate")).toHaveLength(1)
  const history = await t.run((ctx) =>
    ctx.db
      .query("ticketCheckInHistory")
      .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ids.firstId))
      .collect(),
  )
  expect(history).toHaveLength(1)
  expect(history[0]).toMatchObject({ linkId: ids.helperId, linkName: "Gate volunteer", operatorName: "Gate volunteer" })
  expect(history[0]?.operatorId).toBeUndefined()
})

test("link identity and name survive public and authenticated history projections, including a user-only legacy entry", async () => {
  const { t, ids, code } = await setup()
  const checked = await t.mutation(api.scannerLinks.scannerLinkTicketCheckInMutation, {
    code,
    eventKey: "one",
    ticketId: ids.firstId,
  })
  expect(checked).toMatchObject({
    success: true,
    data: { ticket: { checkedInBy: null, checkedInByName: "Gate volunteer" } },
  })
  if (!checked.success) return
  const history = await t.query(api.scannerLinks.scannerLinkTicketCheckInHistoryPaginatedQuery, {
    code,
    eventKey: "one",
    ticketId: ids.firstId,
    cursor: null,
  })
  expect(history).toMatchObject({
    success: true,
    data: { page: [{ linkId: ids.helperId, linkName: "Gate volunteer", operatorId: null }] },
  })
  const userId = await t.run(async (ctx) => (await ctx.db.get(ids.parentId))?.createdByUserId)
  if (!userId) throw new Error("Missing fixture user")
  const authenticatedHistory = await t.query(api.organizer.organizerTicketCheckInHistoryPaginatedQuery, {
    token: await createToken(userId, authSecret),
    eventKey: "one",
    ticketId: ids.firstId,
    cursor: null,
  })
  expect(authenticatedHistory).toMatchObject({
    success: true,
    data: { page: [{ linkId: ids.helperId, linkName: "Gate volunteer", operatorId: null }] },
  })
  const detail = await t.query(api.scannerLinks.scannerLinkEventTicketGetQuery, {
    code,
    eventKey: "one",
    ticketId: ids.firstId,
  })
  expect(detail).toMatchObject({ success: true, data: { checkIn: { operatorName: "Gate volunteer" } } })
  if (!history.success) return
  expect(
    (
      await t.query(api.scannerLinks.scannerLinkTicketCheckInHistoryPaginatedQuery, {
        code,
        eventKey: "one",
        ticketId: ids.secondId,
        cursor: history.data.continueCursor,
      })
    ).success,
  ).toBe(false)
  await t.run(async (ctx) => {
    const ticket = await ctx.db.get(ids.secondId)
    const parent = await ctx.db.get(ids.parentId)
    if (!ticket || !parent?.createdByUserId) throw new Error("Missing fixture")
    await ctx.db.insert("ticketCheckInHistory", {
      ticketId: ticket._id,
      orderId: ticket.orderId,
      eventKey: "one",
      ticketNumber: ticket.code,
      action: "check_in",
      occurredAt: "2026-09-01T00:00:00Z",
      checkInAt: "2026-09-01T00:00:00Z",
      operatorId: parent.createdByUserId,
      operatorName: "Staff",
      participantName: "Grace Hopper",
      buyerName: "Ada Lovelace",
      buyerEmail: "buyer@example.com",
    })
  })
  const legacy = await t.query(api.scannerLinks.scannerLinkTicketCheckInHistoryPaginatedQuery, {
    code,
    eventKey: "one",
    ticketId: ids.secondId,
    cursor: null,
  })
  expect(legacy).toMatchObject({
    success: true,
    data: { page: [{ operatorName: "Staff", linkId: null, linkName: null }] },
  })
})
