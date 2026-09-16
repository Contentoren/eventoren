/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Doc, Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "organizer-ticket-listing-convex-test-secret"
process.env.AUTH_SECRET = authSecret

type EventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">

async function tokenFor(userId: Id<"users">) {
  return await createToken(userId, authSecret)
}

function eventInsert(eventKey: string, startsAt: string): EventInsert {
  return {
    eventKey,
    title: eventKey,
    subtitle: "Organizer test event",
    description: "Organizer test event description",
    category: "konzerte",
    startsAt,
    endsAt: "2099-01-01T22:00:00.000Z",
    doorsAt: "2099-01-01T17:00:00.000Z",
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

async function seed(t: ReturnType<typeof convexTest>) {
  const invitation = "2026-09-15T12:00:00.000Z"
  const ids = await t.run(async (ctx) => {
    const organizerId = await ctx.db.insert("users", {
      name: "Organizer test user",
      role: "organizer",
      organizerInvitedAt: invitation,
      createdAt: invitation,
      updatedAt: invitation,
    })
    const customerId = await ctx.db.insert("users", {
      name: "Customer test user",
      role: "customer",
      createdAt: invitation,
      updatedAt: invitation,
    })
    const adminId = await ctx.db.insert("users", {
      name: "Admin test user",
      role: "admin",
      createdAt: invitation,
      updatedAt: invitation,
    })
    const beforeEventId = await ctx.db.insert(
      "catalogEvents",
      eventInsert("before-invitation", "2026-09-15T11:59:59.999Z"),
    )
    const exactEventId = await ctx.db.insert("catalogEvents", eventInsert("exact-invitation", invitation))
    const afterEventId = await ctx.db.insert(
      "catalogEvents",
      eventInsert("after-invitation", "2026-09-15T12:00:00.001Z"),
    )
    const oldEventId = await ctx.db.insert("catalogEvents", eventInsert("old-event", "1970-01-01T00:00:00.000Z"))
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "organizer-listing-checkout",
      customerEmail: "buyer@example.com",
      customerGivenName: "Ada",
      customerFamilyName: "Lovelace",
      contactSnapshotJson: JSON.stringify({ email: "buyer@example.com", givenName: "Ada", familyName: "Lovelace" }),
      eventKey: "exact-invitation",
      eventTitle: "exact-invitation",
      eventSubtitle: "Organizer test event",
      eventDescription: "Organizer test event description",
      eventStartsAt: invitation,
      eventEndsAt: "2099-01-01T22:00:00.000Z",
      eventDoorsAt: "2099-01-01T17:00:00.000Z",
      venue: "Test hall",
      city: "Berlin",
      address: "Test street 1",
      organizer: "Eventoren",
      imageUrl: "/images/exact-invitation.webp",
      imageAlt: "exact-invitation image",
      catalogVersion: 1,
      subtotalCents: 2_500,
      feeCents: 300,
      totalCents: 2_800,
      checkoutContextJson: "{}",
      paymentReference: "organizer-listing-payment",
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: Date.now(),
      createdAt: invitation,
      updatedAt: invitation,
      paidAt: invitation,
    })
    const legacyTicketId = await ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 1,
      code: "TKT-LEGACY",
      eventKey: "exact-invitation",
      eventTitle: "exact-invitation",
      eventStartsAt: invitation,
      eventDoorsAt: "2099-01-01T17:00:00.000Z",
      venue: "Test hall",
      city: "Berlin",
      address: "Test street 1",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 2_500,
      feeCents: 300,
      issuedAt: invitation,
    })
    const cancelledTicketId = await ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 2,
      code: "TKT-CANCELLED",
      eventKey: "exact-invitation",
      eventTitle: "exact-invitation",
      eventStartsAt: invitation,
      eventDoorsAt: "2099-01-01T17:00:00.000Z",
      venue: "Test hall",
      city: "Berlin",
      address: "Test street 1",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 4_000,
      feeCents: 300,
      participantName: "Grace Hopper",
      cancelled: true,
      issuedAt: invitation,
    })
    return {
      organizerId,
      customerId,
      adminId,
      beforeEventId,
      exactEventId,
      afterEventId,
      oldEventId,
      legacyTicketId,
      cancelledTicketId,
    }
  })
  return ids
}

test("organizer event listing applies the invitation boundary while admins see every date", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const organizer = await t.query(api.organizer.organizerEventListQuery, {
    token: await tokenFor(ids.organizerId),
    paginationOpts: { numItems: 50, cursor: null },
  })
  const admin = await t.query(api.organizer.organizerEventListQuery, {
    token: await tokenFor(ids.adminId),
    paginationOpts: { numItems: 50, cursor: null },
  })

  expect(organizer).toMatchObject({ success: true })
  expect(admin).toMatchObject({ success: true })
  if (!organizer.success || !admin.success) return
  expect(organizer.data.page.map((event) => event.eventKey)).toEqual(["exact-invitation", "after-invitation"])
  expect(organizer.data.page[0]).toMatchObject({
    imageUrl: "/images/exact-invitation.webp",
    startsAt: "2026-09-15T12:00:00.000Z",
  })
  expect(admin.data.page.map((event) => event.eventKey)).toEqual([
    "old-event",
    "before-invitation",
    "exact-invitation",
    "after-invitation",
  ])
})

test("organizer event pages continue past unauthorized source rows and bind cursors", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const organizerToken = await tokenFor(ids.organizerId)
  const adminToken = await tokenFor(ids.adminId)

  const first = await t.query(api.organizer.organizerEventListQuery, {
    token: organizerToken,
    paginationOpts: { numItems: 2, cursor: null },
  })
  expect(first).toMatchObject({ success: true, data: { page: [], isDone: false } })
  if (!first.success) return

  const second = await t.query(api.organizer.organizerEventListQuery, {
    token: organizerToken,
    paginationOpts: { numItems: 2, cursor: first.data.continueCursor },
  })
  expect(second).toMatchObject({
    success: true,
    data: { page: [{ eventKey: "exact-invitation" }, { eventKey: "after-invitation" }], isDone: false },
  })
  if (!second.success) return

  const third = await t.query(api.organizer.organizerEventListQuery, {
    token: organizerToken,
    paginationOpts: { numItems: 2, cursor: second.data.continueCursor },
  })
  expect(third).toMatchObject({ success: true, data: { page: [], isDone: true } })

  const mismatchedCursor = await t.query(api.organizer.organizerEventListQuery, {
    token: adminToken,
    paginationOpts: { numItems: 2, cursor: first.data.continueCursor },
  })
  expect(mismatchedCursor.success).toBe(false)
})

test("ticket list and detail search participant and buyer names and preserve legacy/cancelled data", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const token = await tokenFor(ids.organizerId)

  const all = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    token,
    paginationOpts: { numItems: 50, cursor: null },
  })
  const participantSearch = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    search: "hopper",
    token,
    paginationOpts: { numItems: 50, cursor: null },
  })
  const buyerSearch = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    search: "lovelace",
    token,
    paginationOpts: { numItems: 50, cursor: null },
  })
  const detail = await t.query(api.organizer.organizerEventTicketGetQuery, {
    eventKey: "exact-invitation",
    ticketId: ids.legacyTicketId,
    token,
  })

  expect(all).toMatchObject({
    success: true,
    data: { page: [{ ticketNumber: "TKT-LEGACY" }, { ticketNumber: "TKT-CANCELLED" }] },
  })
  expect(participantSearch).toMatchObject({
    success: true,
    data: { page: [{ participantName: "Grace Hopper", cancelled: true }] },
  })
  expect(buyerSearch).toMatchObject({
    success: true,
    data: {
      page: [{ participantName: "Ada Lovelace", participantNameSource: "buyer" }, { participantName: "Grace Hopper" }],
    },
  })
  expect(detail).toMatchObject({
    success: true,
    data: {
      ticketNumber: "TKT-LEGACY",
      buyerEmail: "buyer@example.com",
      priceEur: 25,
      paymentStatus: "paid",
      cancelled: false,
      participantName: "Ada Lovelace",
    },
  })
})

test("ticket pages preserve order across sparse matches, deduplicate shared orders, and bind cursors", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const token = await tokenFor(ids.organizerId)

  const first = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    token,
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(first).toMatchObject({
    success: true,
    data: { page: [{ ticketNumber: "TKT-LEGACY" }], isDone: false },
  })
  if (!first.success) return

  const second = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    token,
    paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
  })
  expect(second).toMatchObject({
    success: true,
    data: { page: [{ ticketNumber: "TKT-CANCELLED" }], isDone: false },
  })
  if (!second.success) return

  const third = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    token,
    paginationOpts: { numItems: 1, cursor: second.data.continueCursor },
  })
  expect(third).toMatchObject({ success: true, data: { page: [], isDone: true } })

  const sparseFirst = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    search: "hopper",
    token,
    paginationOpts: { numItems: 1, cursor: null },
  })
  expect(sparseFirst).toMatchObject({ success: true, data: { page: [], isDone: false } })
  if (!sparseFirst.success) return

  const sparseSecond = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    search: "hopper",
    token,
    paginationOpts: { numItems: 1, cursor: sparseFirst.data.continueCursor },
  })
  expect(sparseSecond).toMatchObject({
    success: true,
    data: { page: [{ ticketNumber: "TKT-CANCELLED" }], isDone: false },
  })
  if (!sparseSecond.success) return

  const sparseThird = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    search: "hopper",
    token,
    paginationOpts: { numItems: 1, cursor: sparseSecond.data.continueCursor },
  })
  expect(sparseThird).toMatchObject({ success: true, data: { page: [], isDone: true } })

  const sharedOrderPage = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    token,
    paginationOpts: { numItems: 2, cursor: null },
  })
  expect(sharedOrderPage).toMatchObject({
    success: true,
    data: { page: [{ buyerName: "Ada Lovelace" }, { buyerName: "Ada Lovelace" }] },
  })

  const crossEvent = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "after-invitation",
    token,
    paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
  })
  expect(crossEvent).toMatchObject({ success: false })

  const crossSearch = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    search: "lovelace",
    token,
    paginationOpts: { numItems: 1, cursor: first.data.continueCursor },
  })
  expect(crossSearch).toMatchObject({ success: false })
})

test("customer direct access and organizer access before the boundary are rejected", async () => {
  const t = convexTest(schema, modules)
  const ids = await seed(t)
  const customerToken = await tokenFor(ids.customerId)
  const organizerToken = await tokenFor(ids.organizerId)

  const customer = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "exact-invitation",
    token: customerToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  const before = await t.query(api.organizer.organizerEventTicketListQuery, {
    eventKey: "before-invitation",
    token: organizerToken,
    paginationOpts: { numItems: 50, cursor: null },
  })
  const mismatchedDetail = await t.query(api.organizer.organizerEventTicketGetQuery, {
    eventKey: "after-invitation",
    ticketId: ids.legacyTicketId,
    token: organizerToken,
  })
  const organizerDetail = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "exact-invitation",
    token: organizerToken,
  })
  const unauthorizedDetail = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "before-invitation",
    token: organizerToken,
  })
  const customerDetail = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "exact-invitation",
    token: customerToken,
  })
  const adminDetail = await t.query(api.organizer.organizerEventGetQuery, {
    eventKey: "before-invitation",
    token: await tokenFor(ids.adminId),
  })

  expect(customer.success).toBe(false)
  expect(before.success).toBe(false)
  expect(mismatchedDetail.success).toBe(false)
  expect(organizerDetail).toMatchObject({ success: true, data: { eventKey: "exact-invitation" } })
  expect(unauthorizedDetail.success).toBe(false)
  expect(customerDetail.success).toBe(false)
  expect(adminDetail).toMatchObject({ success: true, data: { eventKey: "before-invitation" } })
})
