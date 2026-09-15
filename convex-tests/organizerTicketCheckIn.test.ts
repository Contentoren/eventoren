/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc, Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "organizer-ticket-check-in-convex-test-secret"
process.env.AUTH_SECRET = authSecret

type EventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">
type OrderInsert = Omit<Doc<"ticketOrders">, "_id" | "_creationTime">
type TicketInsert = Omit<Doc<"ticketIssued">, "_id" | "_creationTime">

async function tokenFor(userId: Id<"users">): Promise<string> {
  return await createToken(userId, authSecret)
}

function eventInsert(eventKey: string): EventInsert {
  return {
    eventKey,
    title: eventKey,
    subtitle: "Organizer check-in test event",
    description: "Organizer check-in test event description",
    category: "konzerte",
    startsAt: "2026-09-15T13:00:00.000Z",
    endsAt: "2099-01-01T22:00:00.000Z",
    doorsAt: "2026-09-15T12:30:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Test street 1",
    organizer: "Eventoren",
    imageUrl: `/images/${eventKey}.webp`,
    imageAlt: `${eventKey} image`,
    tags: [],
    status: "published",
    catalogVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }
}

function orderInsert(
  eventKey: string,
  checkoutKey: string,
  status: OrderInsert["status"],
  paymentStatus: OrderInsert["paymentStatus"],
): OrderInsert {
  return {
    checkoutKey,
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    contactSnapshotJson: JSON.stringify({ email: "buyer@example.com", givenName: "Ada", familyName: "Lovelace" }),
    eventKey,
    eventTitle: eventKey,
    eventSubtitle: "Organizer check-in test event",
    eventDescription: "Organizer check-in test event description",
    eventStartsAt: "2026-09-15T13:00:00.000Z",
    eventEndsAt: "2099-01-01T22:00:00.000Z",
    eventDoorsAt: "2026-09-15T12:30:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Test street 1",
    organizer: "Eventoren",
    imageUrl: `/images/${eventKey}.webp`,
    imageAlt: `${eventKey} image`,
    catalogVersion: 1,
    subtotalCents: 2_500,
    feeCents: 300,
    totalCents: 2_800,
    checkoutContextJson: "{}",
    paymentReference: `${checkoutKey}-payment`,
    stripeMode: "test",
    status,
    paymentStatus,
    reservationExpiresAt: Date.now(),
    createdAt: "2026-09-15T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
    paidAt: paymentStatus === "paid" ? "2026-09-15T12:01:00.000Z" : undefined,
  }
}

function ticketInsert(orderId: Id<"ticketOrders">, eventKey: string, code: string, sequence: number): TicketInsert {
  return {
    orderId,
    sequence,
    code,
    eventKey,
    eventTitle: eventKey,
    eventStartsAt: "2026-09-15T13:00:00.000Z",
    eventDoorsAt: "2026-09-15T12:30:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Test street 1",
    tierKey: "standard",
    tierName: "Standard",
    priceCents: 2_500,
    feeCents: 300,
    participantName: "Grace Hopper",
    issuedAt: "2026-09-15T12:01:00.000Z",
  }
}

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const organizerId = await ctx.db.insert("users", {
      name: "Organizer Operator",
      email: "organizer@example.com",
      role: "organizer",
      organizerInvitedAt: "2026-09-15T12:00:00.000Z",
      createdAt: "2026-09-15T12:00:00.000Z",
      updatedAt: "2026-09-15T12:00:00.000Z",
    })
    const secondOrganizerId = await ctx.db.insert("users", {
      name: "Second Operator",
      email: "second@example.com",
      role: "organizer",
      organizerInvitedAt: "2026-09-15T12:00:00.000Z",
      createdAt: "2026-09-15T12:00:00.000Z",
      updatedAt: "2026-09-15T12:00:00.000Z",
    })
    const customerId = await ctx.db.insert("users", {
      name: "Customer User",
      role: "customer",
      createdAt: "2026-09-15T12:00:00.000Z",
      updatedAt: "2026-09-15T12:00:00.000Z",
    })
    await ctx.db.insert("catalogEvents", eventInsert("check-in-event"))
    await ctx.db.insert("catalogEvents", eventInsert("other-event"))

    const paidOrderId = await ctx.db.insert(
      "ticketOrders",
      orderInsert("check-in-event", "order-paid-code", "paid", "paid"),
    )
    const unpaidOrderId = await ctx.db.insert(
      "ticketOrders",
      orderInsert("check-in-event", "order-unpaid-code", "reserved", "pending"),
    )
    const cancelledOrderId = await ctx.db.insert(
      "ticketOrders",
      orderInsert("check-in-event", "order-cancelled-code", "paid", "paid"),
    )
    const otherEventOrderId = await ctx.db.insert(
      "ticketOrders",
      orderInsert("other-event", "order-other-code", "paid", "paid"),
    )
    const paidTicketId = await ctx.db.insert("ticketIssued", ticketInsert(paidOrderId, "check-in-event", "TKT-PAID", 1))
    const raceTicketId = await ctx.db.insert("ticketIssued", ticketInsert(paidOrderId, "check-in-event", "TKT-RACE", 2))
    const duplicateTicketId = await ctx.db.insert(
      "ticketIssued",
      ticketInsert(paidOrderId, "check-in-event", "TKT-DUPLICATE", 3),
    )
    await ctx.db.insert("ticketIssued", ticketInsert(paidOrderId, "check-in-event", "TKT-DUPLICATE", 4))
    const unpaidTicketId = await ctx.db.insert(
      "ticketIssued",
      ticketInsert(unpaidOrderId, "check-in-event", "TKT-UNPAID", 1),
    )
    const cancelledTicketId = await ctx.db.insert("ticketIssued", {
      ...ticketInsert(cancelledOrderId, "check-in-event", "TKT-CANCELLED", 1),
      cancelled: true,
    })
    const otherEventTicketId = await ctx.db.insert(
      "ticketIssued",
      ticketInsert(otherEventOrderId, "other-event", "TKT-OTHER", 1),
    )
    return {
      organizerId,
      secondOrganizerId,
      customerId,
      paidTicketId,
      raceTicketId,
      duplicateTicketId,
      unpaidTicketId,
      cancelledTicketId,
      otherEventTicketId,
    }
  })
}

function expectErrorCode(result: { success: false; code?: string }): void {
  expect(result.success).toBe(false)
  expect(result.code).toBeDefined()
}

test("rejects invalid, order, duplicate-code, wrong-event, unpaid, and cancelled check-ins", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const token = await tokenFor(ids.organizerId)

  const invalid = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: " ",
    token,
  })
  const orderCode = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "order-paid-code",
    token,
  })
  const unknownCode = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-UNKNOWN",
    token,
  })
  const duplicateCode = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-DUPLICATE",
    token,
  })
  const wrongEvent = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-OTHER",
    token,
  })
  const unpaid = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-UNPAID",
    token,
  })
  const cancelled = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-CANCELLED",
    token,
  })

  expectErrorCode(invalid)
  expect(invalid.code).toBe("organizer.check-in.invalid-code")
  expectErrorCode(orderCode)
  expect(orderCode.code).toBe("organizer.check-in.order-code-not-accepted")
  expectErrorCode(unknownCode)
  expect(unknownCode.code).toBe("organizer.check-in.unknown-ticket")
  expectErrorCode(duplicateCode)
  expect(duplicateCode.code).toBe("organizer.check-in.ambiguous-ticket-code")
  expectErrorCode(wrongEvent)
  expect(wrongEvent.code).toBe("organizer.check-in.wrong-event")
  expectErrorCode(unpaid)
  expect(unpaid.code).toBe("organizer.check-in.unpaid")
  expectErrorCode(cancelled)
  expect(cancelled.code).toBe("organizer.check-in.cancelled")

  const history = await t.query(api.organizer.organizerTicketCheckInHistoryQuery, {
    eventKey: "check-in-event",
    ticketId: ids.duplicateTicketId,
    token,
  })
  expect(history).toMatchObject({ success: true, data: [] })
})

test("checks in atomically, reports the previous operator and exposes current projection", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const firstToken = await tokenFor(ids.organizerId)
  const secondToken = await tokenFor(ids.secondOrganizerId)

  const first = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketId: ids.paidTicketId,
    token: firstToken,
  })
  expect(first).toMatchObject({
    success: true,
    data: {
      status: "checked-in",
      ticket: {
        checkedIn: true,
        checkedInByName: "Organizer Operator",
        checkIn: { status: "checked-in" },
      },
    },
  })

  const duplicate = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-PAID",
    token: secondToken,
  })
  expectErrorCode(duplicate)
  expect(duplicate.code).toBe("organizer.check-in.duplicate")
  expect(duplicate.errorMessage).toContain("Organizer Operator")
  expect(duplicate.errorMessage).toContain("Grace Hopper")
  expect(duplicate.errorMessage).toContain("Ada Lovelace")
  expect(duplicate.errorMessage).toContain("TKT-PAID")
  if (duplicate.success || typeof duplicate.errorData !== "string") return
  const duplicateDetails = JSON.parse(duplicate.errorData) as Record<string, unknown>
  expect(duplicateDetails).toMatchObject({
    previousOperator: "Organizer Operator",
    participantName: "Grace Hopper",
    buyerName: "Ada Lovelace",
    buyerEmail: "buyer@example.com",
    ticketNumber: "TKT-PAID",
  })
  expect(duplicateDetails.elapsedMilliseconds).toBeTypeOf("number")

  const list = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "check-in-event",
    token: firstToken,
  })
  expect(list).toMatchObject({ success: true })
  if (!list.success) return
  expect(list.data.find((ticket) => ticket.id === ids.paidTicketId)).toMatchObject({
    checkedIn: true,
    checkIn: { status: "checked-in", operatorName: "Organizer Operator" },
  })
})

test("allows only one concurrent check-in and writes one audit event", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const firstToken = await tokenFor(ids.organizerId)
  const secondToken = await tokenFor(ids.secondOrganizerId)

  const results = await Promise.all([
    t.mutation(api.organizer.organizerTicketCheckInMutation, {
      eventKey: "check-in-event",
      ticketCode: "TKT-RACE",
      token: firstToken,
    }),
    t.mutation(api.organizer.organizerTicketCheckInMutation, {
      eventKey: "check-in-event",
      ticketCode: "TKT-RACE",
      token: secondToken,
    }),
  ])
  expect(results.filter((result) => result.success)).toHaveLength(1)
  expect(results.filter((result) => !result.success && result.code === "organizer.check-in.duplicate")).toHaveLength(1)

  const history = await t.query(api.organizer.organizerTicketCheckInHistoryQuery, {
    eventKey: "check-in-event",
    ticketId: ids.raceTicketId,
    token: firstToken,
  })
  expect(history).toMatchObject({ success: true })
  if (!history.success) return
  expect(history.data).toHaveLength(1)
  expect(history.data[0]).toMatchObject({ action: "check_in", ticketNumber: "TKT-RACE" })
})

test("requires organizer authorization for check-in and reset, then permits reset and recheck-in", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const organizerToken = await tokenFor(ids.organizerId)
  const customerToken = await tokenFor(ids.customerId)

  const unauthorizedCheckIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-PAID",
    token: customerToken,
  })
  expectErrorCode(unauthorizedCheckIn)
  expect(unauthorizedCheckIn.code).toBe("organizer.check-in.unauthorized")

  const checkedIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-PAID",
    token: organizerToken,
  })
  expect(checkedIn.success).toBe(true)

  const unauthorizedReset = await t.mutation(api.organizer.organizerTicketCheckInResetMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-PAID",
    token: customerToken,
  })
  expectErrorCode(unauthorizedReset)
  expect(unauthorizedReset.code).toBe("organizer.check-in.unauthorized")

  const reset = await t.mutation(api.organizer.organizerTicketCheckInResetMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-PAID",
    token: organizerToken,
  })
  expect(reset).toMatchObject({ success: true, data: { status: "reset", ticket: { checkedIn: false } } })

  const recheckedIn = await t.mutation(api.organizer.organizerTicketCheckInMutation, {
    eventKey: "check-in-event",
    ticketCode: "TKT-PAID",
    token: organizerToken,
  })
  expect(recheckedIn).toMatchObject({ success: true, data: { status: "checked-in", ticket: { checkedIn: true } } })

  const history = await t.query(api.organizer.organizerTicketCheckInHistoryQuery, {
    eventKey: "check-in-event",
    ticketId: ids.paidTicketId,
    token: organizerToken,
  })
  expect(history).toMatchObject({ success: true })
  if (!history.success) return
  expect(history.data.map((entry) => entry.action)).toEqual(["check_in", "reset", "check_in"])
  expect(history.data.every((entry) => entry.participantName === "Grace Hopper")).toBe(true)
})
