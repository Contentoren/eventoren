/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi, afterEach } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "e2e-catalog-cleanup-test-secret"
process.env.AUTH_SECRET = secret
const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const eventKey = `ticket-e2e-${runId}`
const eventTitle = `Ticket E2E ${runId}`
const organizer = `Eventoren Ticket E2E ${runId}`
const participantName = `E2E Participant ${runId}`
const day = 24 * 60 * 60_000

afterEach(() => vi.useRealTimers())

test("archives only the exact stale run event and product while leaving an unrelated event intact", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-26T12:00:00Z"))
  const runCreatedAt = Date.now() - day - 60_000
  vi.setSystemTime(runCreatedAt)
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const adminId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "User", role: "user", createdAt: now, updatedAt: now }),
  )
  const token = await createToken(adminId, secret)
  const userToken = await createToken(userId, secret)
  const eventData = {
    eventKey,
    title: eventTitle,
    organizer,
    subtitle: "",
    description: "",
    category: "test",
    startsAt: now,
    endsAt: now,
    doorsAt: now,
    venue: "Test",
    city: "Berlin",
    address: "Test",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status: "published" as const,
    catalogVersion: 1,
    createdAt: now,
    updatedAt: now,
  }
  const eventId = await t.run((ctx) => ctx.db.insert("catalogEvents", eventData))
  const unrelatedId = await t.run((ctx) =>
    ctx.db.insert("catalogEvents", {
      ...eventData,
      eventKey: "real-event",
      title: "Real event",
      organizer: "Real organizer",
    }),
  )
  const tierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "paid-ticket",
      name: `Paid ticket ${runId}`,
      description: "",
      priceCents: 2400,
      feeCents: 0,
      capacity: 10,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  vi.setSystemTime(runCreatedAt + day + 60_000)
  const args = {
    token,
    runId,
    eventKey,
    eventTitle,
    organizer,
    eventId: eventKey,
    participantName,
    productId: "paid-ticket",
    runCreatedAt,
    successfulOwnedCurrentRun: false,
  }
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, token: userToken })).success).toBe(false)
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, eventKey: "real-event" })).success).toBe(
    false,
  )
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, productId: "other" })).success).toBe(false)
  const cleaned = await t.mutation(api.catalog.catalogE2eCleanupMutation, args)
  expect(cleaned).toMatchObject({
    success: true,
    data: { eventArchived: true, product: "deleted", retainedOrders: 0, retainedTickets: 0 },
  })
  const verified = await t.run(async (ctx) => ({
    event: await ctx.db.get("catalogEvents", eventId),
    tier: await ctx.db.get("catalogTicketTiers", tierId),
    unrelated: await ctx.db.get("catalogEvents", unrelatedId),
  }))
  expect(verified.event).toMatchObject({ status: "archived", deletedAt: expect.any(String) })
  expect(verified.tier).toBeNull()
  expect(verified.unrelated).toMatchObject({ status: "published", eventKey: "real-event" })
  expect(verified.unrelated?.deletedAt).toBeUndefined()
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, eventId: "wrong" })).success).toBe(false)
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, args)).success).toBe(true)
})

test("refuses a young unsuccessful fixture and an event whose organizer is not the run organization", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-26T12:00:00Z"))
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const adminId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  const token = await createToken(adminId, secret)
  const eventId = await t.run((ctx) =>
    ctx.db.insert("catalogEvents", {
      eventKey,
      title: eventTitle,
      organizer: "Other organization",
      subtitle: "",
      description: "",
      category: "test",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "draft",
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const eventCreation = await t.run(async (ctx) => (await ctx.db.get("catalogEvents", eventId))!._creationTime)
  vi.setSystemTime(eventCreation + 1000)
  const args = {
    token,
    runId,
    eventKey,
    eventTitle,
    organizer,
    runCreatedAt: Math.floor(eventCreation) - 1000,
    participantName,
    successfulOwnedCurrentRun: true,
  }
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, args)).success).toBe(false)
  await t.run((ctx) => ctx.db.patch("catalogEvents", eventId, { organizer }))
  expect(
    (await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, successfulOwnedCurrentRun: false })).success,
  ).toBe(false)
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, args)).success).toBe(true)
})

test("refuses live Stripe orders and retains TEST orders and sold product history", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-26T12:00:00Z"))
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const adminId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  const token = await createToken(adminId, secret)
  const eventId = await t.run((ctx) =>
    ctx.db.insert("catalogEvents", {
      eventKey,
      title: eventTitle,
      organizer,
      subtitle: "",
      description: "",
      category: "test",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const tierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "paid-ticket",
      name: `Paid ticket ${runId}`,
      description: "",
      priceCents: 2400,
      feeCents: 0,
      capacity: 10,
      reserved: 0,
      sold: 1,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const orderId = await t.run((ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: "owned-checkout",
      customerGivenName: "E2E",
      customerFamilyName: runId,
      customerEmail: "test@example.com",
      contactSnapshotJson: "{}",
      legalDocumentSetRevision: "accepted-v1",
      legalTermsMarkdown: "Accepted terms remain immutable",
      eventKey,
      eventTitle,
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      organizer,
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2400,
      feeCents: 0,
      totalCents: 2400,
      checkoutContextJson: "{}",
      paymentReference: "owned-payment",
      stripeMode: "live",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: 0,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const eventCreation = await t.run(async (ctx) => (await ctx.db.get("catalogEvents", eventId))!._creationTime)
  vi.setSystemTime(eventCreation + 1000)
  const args = {
    token,
    runId,
    eventKey,
    eventTitle,
    organizer,
    productId: "paid-ticket",
    participantName,
    orderId,
    runCreatedAt: Math.floor(eventCreation) - 1000,
    successfulOwnedCurrentRun: true,
  }
  await t.run((ctx) =>
    ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId,
      eventKey,
      tierKey: "paid-ticket",
      tierName: `Paid ticket ${runId}`,
      tierDescription: "",
      quantity: 1,
      participantNamesJson: JSON.stringify([participantName]),
      priceCents: 2400,
      feeCents: 0,
      createdAt: now,
    }),
  )
  const ticketId = await t.run((ctx) =>
    ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 1,
      code: "TKT-E2E-EXACT",
      eventKey,
      eventTitle,
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      tierKey: "paid-ticket",
      tierName: `Paid ticket ${runId}`,
      priceCents: 2400,
      feeCents: 0,
      participantName,
      issuedAt: now,
    }),
  )
  const paidArgs = { ...args, ticketId }
  const attemptId = await t.run((ctx) =>
    ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: "owned-payment",
      stripeMode: "live",
      status: "paid",
      createdAt: now,
      updatedAt: now,
    }),
  )
  const historyId = await t.run((ctx) =>
    ctx.db.insert("ticketCheckInHistory", {
      ticketId,
      orderId,
      eventKey,
      ticketNumber: "1",
      action: "check_in",
      occurredAt: now,
      checkInAt: now,
      operatorId: adminId,
      operatorName: "Admin",
      participantName,
      buyerName: "E2E",
      buyerEmail: "test@example.com",
    }),
  )
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, args)).success).toBe(false)
  expect(
    (await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...paidArgs, participantName: "Customer" })).success,
  ).toBe(false)
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, orderId: undefined })).success).toBe(false)
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, orderId: "foreign-order" })).success).toBe(
    false,
  )
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, paidArgs)).success).toBe(false)
  expect((await t.run((ctx) => ctx.db.get("catalogEvents", eventId)))?.deletedAt).toBeUndefined()
  await t.run((ctx) => ctx.db.patch("ticketOrders", orderId, { stripeMode: "test" }))
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, paidArgs)).success).toBe(false)
  await t.run((ctx) => ctx.db.patch("ticketPaymentAttempts", attemptId, { stripeMode: "test" }))
  expect(await t.mutation(api.catalog.catalogE2eCleanupMutation, paidArgs)).toMatchObject({
    success: true,
    data: { product: "archived", retainedOrders: 1, paidHistory: "retained", pdfStorage: "external-not-deleted" },
  })
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", orderId))).toMatchObject({
    stripeMode: "test",
    status: "paid",
    legalDocumentSetRevision: "accepted-v1",
    legalTermsMarkdown: "Accepted terms remain immutable",
  })
  expect(await t.run((ctx) => ctx.db.get("ticketIssued", ticketId))).toMatchObject({ participantName, orderId })
  expect(await t.run((ctx) => ctx.db.get("ticketCheckInHistory", historyId))).toMatchObject({ ticketId, orderId })
  expect(await t.run((ctx) => ctx.db.get("ticketPaymentAttempts", attemptId))).toMatchObject({
    orderId,
    stripeMode: "test",
    status: "paid",
  })
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", tierId))).toMatchObject({
    sold: 1,
    archivedAt: expect.any(String),
  })
})
