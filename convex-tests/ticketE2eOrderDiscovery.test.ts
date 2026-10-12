/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "ticket-e2e-discovery-test-secret"
process.env.AUTH_SECRET = authSecret
const runId = "abc-12345678-1234-1234-1234-123456789abc"
const eventKey = `ticket-e2e-${runId}`
const eventTitle = `Ticket E2E ${runId}`
const eventOrganizer = `Eventoren Ticket E2E ${runId}`
const expectedParticipant = `E2E Participant ${runId}`

async function userInsert(t: ReturnType<typeof convexTest>, role: "admin" | "user") {
  const now = new Date().toISOString()
  return await t.run(async (ctx) => ctx.db.insert("users", { name: role, role, createdAt: now, updatedAt: now }))
}

async function eventInsert(t: ReturnType<typeof convexTest>) {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("catalogEvents", {
      eventKey,
      title: eventTitle,
      subtitle: "E2E",
      description: "E2E",
      category: "konzerte",
      startsAt: "2026-10-01T18:00:00.000Z",
      endsAt: "2026-10-01T22:00:00.000Z",
      doorsAt: "2026-10-01T17:00:00.000Z",
      venue: "Hall",
      city: "Berlin",
      address: "Street 1",
      organizer: eventOrganizer,
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function tierInsert(t: ReturnType<typeof convexTest>, eventId: Id<"catalogEvents">) {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: `Paid ticket ${runId}`,
      description: "E2E",
      priceCents: 2500,
      feeCents: 300,
      capacity: 10,
      reserved: 1,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function orderInsert(
  t: ReturnType<typeof convexTest>,
  ownerUserId: Id<"users">,
  overrides: {
    eventKey?: string
    eventTitle?: string
    organizer?: string
    customerGivenName?: string
    customerFamilyName?: string
    status?: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released"
    paymentStatus?: "pending" | "paid" | "failed" | "expired"
    billingOrderReference?: string | null
    checkoutUrl?: string | null
  } = {},
) {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: `checkout-${Math.random().toString(36).slice(2)}`,
      ownerUserId,
      customerEmail: "ticket-e2e@example.test",
      customerGivenName: overrides.customerGivenName ?? "E2E",
      customerFamilyName: overrides.customerFamilyName ?? runId,
      customerAddress: "Teststraße 1, 10115 Berlin",
      customerPhone: "+491234567890",
      contactSnapshotJson: JSON.stringify({ email: "ticket-e2e@example.test" }),
      eventKey: overrides.eventKey ?? eventKey,
      eventTitle: overrides.eventTitle ?? eventTitle,
      eventSubtitle: "E2E",
      eventDescription: "E2E",
      eventStartsAt: "2026-10-01T18:00:00.000Z",
      eventEndsAt: "2026-10-01T22:00:00.000Z",
      eventDoorsAt: "2026-10-01T17:00:00.000Z",
      venue: "Hall",
      city: "Berlin",
      address: "Street 1",
      organizer: overrides.organizer ?? eventOrganizer,
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2500,
      feeCents: 300,
      totalCents: 2800,
      checkoutContextJson: "{}",
      paymentReference: `payment_${Math.random().toString(36).slice(2)}`,
      stripeMode: "test",
      ...(overrides.billingOrderReference ? { billingOrderReference: overrides.billingOrderReference } : {}),
      ...(overrides.checkoutUrl ? { checkoutUrl: overrides.checkoutUrl } : {}),
      status: overrides.status ?? "reserved",
      paymentStatus: overrides.paymentStatus ?? "pending",
      reservationExpiresAt: Date.now() + 900_000,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function lineInsert(
  t: ReturnType<typeof convexTest>,
  orderId: Id<"ticketOrders">,
  tierId: Id<"catalogTicketTiers">,
  participantNames: string[],
) {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId,
      eventKey,
      tierKey: "standard",
      tierName: `Paid ticket ${runId}`,
      tierDescription: "E2E",
      quantity: 1,
      participantNamesJson: JSON.stringify(participantNames),
      priceCents: 2500,
      feeCents: 300,
      createdAt: now,
    }),
  )
}

test("discovers one owned reserved pending order with no Stripe session and reports the next page explicitly empty", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const ownerId = await userInsert(t, "user")
  const eventId = await eventInsert(t)
  const tierId = await tierInsert(t, eventId)
  const orderId = await orderInsert(t, ownerId, { status: "reserved", paymentStatus: "pending" })
  await lineInsert(t, orderId, tierId, [expectedParticipant])
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const runCreatedAt = Date.now()

  const first = await t.query(api.ticketing.ticketE2eOrderDiscoveryQuery, {
    token,
    eventKey,
    runId,
    runCreatedAt,
    paginationOpts: { cursor: null, numItems: 10 },
  })
  expect(first.success).toBe(true)
  if (!first.success) return
  expect(first.data.page).toHaveLength(1)
  expect(first.data.page[0]).toMatchObject({
    orderId,
    status: "reserved",
    paymentStatus: "pending",
    billingOrderReference: null,
    checkoutUrl: null,
    stripeSessionId: null,
  })
  expect(first.data.page[0]).not.toHaveProperty("customerEmail")
  expect(first.data.page[0]).not.toHaveProperty("checkoutKey")

  const second = await t.query(api.ticketing.ticketE2eOrderDiscoveryQuery, {
    token,
    eventKey,
    runId,
    runCreatedAt,
    paginationOpts: { cursor: first.data.continueCursor, numItems: 10 },
  })
  expect(second.success).toBe(true)
  if (!second.success) return
  expect(second.data.page).toHaveLength(0)
  expect(second.data.isDone).toBe(true)
})

test("excludes foreign, old and incidental-name rows while keeping the exact owned row", async () => {
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const ownerId = await userInsert(t, "user")
  const eventId = await eventInsert(t)
  const tierId = await tierInsert(t, eventId)
  const ownedId = await orderInsert(t, ownerId, { status: "expired", paymentStatus: "expired" })
  await lineInsert(t, ownedId, tierId, [expectedParticipant])
  const foreignId = await orderInsert(t, ownerId, { eventKey: "ticket-e2e-foreign", eventTitle: "Foreign" })
  await lineInsert(t, foreignId, tierId, [expectedParticipant])
  const incidentalFamilyId = await orderInsert(t, ownerId, { customerFamilyName: `${runId}-extra` })
  await lineInsert(t, incidentalFamilyId, tierId, [expectedParticipant])
  const incidentalParticipantId = await orderInsert(t, ownerId)
  await lineInsert(t, incidentalParticipantId, tierId, [`E2E Participant ${runId} extra`])
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const runCreatedAt = Date.now()

  const result = await t.query(api.ticketing.ticketE2eOrderDiscoveryQuery, {
    token,
    eventKey,
    runId,
    runCreatedAt,
    paginationOpts: { cursor: null, numItems: 50 },
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.page.map((row: { orderId: string }) => row.orderId)).toEqual([ownedId])
  expect(result.data.page[0]).toMatchObject({ status: "expired", paymentStatus: "expired" })

  const oldRun = await t.query(api.ticketing.ticketE2eOrderDiscoveryQuery, {
    token,
    eventKey,
    runId,
    runCreatedAt: Date.now() + 10 * 60_000,
    paginationOpts: { cursor: null, numItems: 50 },
  })
  expect(oldRun.success).toBe(false)
})

test("rejects the discovery query without admin authorization", async () => {
  const t = convexTest(schema, modules)
  const userId = await userInsert(t, "user")
  const userToken = await testAuthSessionTokenCreate(t, userId, authSecret)
  const rejected = await t.query(api.ticketing.ticketE2eOrderDiscoveryQuery, {
    token: userToken,
    eventKey,
    runId,
    runCreatedAt: Date.now(),
    paginationOpts: { cursor: null, numItems: 10 },
  })
  expect(rejected.success).toBe(false)
  const invalid = await t.query(api.ticketing.ticketE2eOrderDiscoveryQuery, {
    token: "invalid-token",
    eventKey,
    runId,
    runCreatedAt: Date.now(),
    paginationOpts: { cursor: null, numItems: 10 },
  })
  expect(invalid.success).toBe(false)
})
