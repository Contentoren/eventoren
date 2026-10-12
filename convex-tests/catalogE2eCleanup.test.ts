/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "e2e-catalog-cleanup-test-secret"
process.env.AUTH_SECRET = secret
const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const eventKey = `ticket-e2e-${runId}`
const eventTitle = `Ticket E2E ${runId}`
const organizer = `Eventoren Ticket E2E ${runId}`
const participantName = `E2E Participant ${runId}`

type Fixture = ReturnType<typeof convexTest>

async function adminTokenFor(t: Fixture, role: "admin" | "user" = "admin") {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) => ctx.db.insert("users", { name: role, role, createdAt: now, updatedAt: now }))
  return { token: await testAuthSessionTokenCreate(t, userId, secret), userId }
}

function eventData(now: string) {
  return {
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
}

async function fullFixtureGraph(t: Fixture, now: string, overrides?: { stripeMode?: "test" | "live" }) {
  const stripeMode = overrides?.stripeMode ?? "test"
  const eventId = await t.run((ctx) => ctx.db.insert("catalogEvents", eventData(now)))
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
      billingOrderReference: "billing-owned",
      stripeMode,
      status: "paid" as const,
      paymentStatus: "paid" as const,
      reservationExpiresAt: 0,
      createdAt: now,
      updatedAt: now,
    }),
  )
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
  await t.run((ctx) =>
    ctx.db.insert("ticketReservations", {
      orderId,
      tierId,
      quantity: 1,
      participantNamesJson: JSON.stringify([participantName]),
      status: "consumed" as const,
      expiresAt: 0,
      createdAt: now,
      releasedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: "owned-payment",
      billingOrderReference: "billing-owned",
      stripeMode,
      status: "paid" as const,
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketOrderDeliveries", {
      orderId,
      accessTokenSnapshot: "snapshot-token",
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketFulfillmentWork", {
      orderId,
      paymentReference: "owned-payment",
      billingOrderReference: "billing-owned",
      stripeMode,
      requestSnapshotJson: "{}",
      status: "prepared" as const,
      attemptCount: 1,
      nextAttemptAt: 0,
      createdAt: now,
      updatedAt: now,
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
  for (const action of ["check_in", "reset"] as const)
    await t.run((ctx) =>
      ctx.db.insert("ticketCheckInHistory", {
        ticketId,
        orderId,
        eventKey,
        ticketNumber: "1",
        action,
        occurredAt: now,
        checkInAt: now,
        operatorName: "Admin",
        participantName,
        buyerName: "E2E",
        buyerEmail: "test@example.com",
      }),
    )
  return { eventId, tierId, orderId, ticketId }
}

function exactArgs(token: string, runCreatedAt: number, ids: { orderId: unknown; ticketId: unknown }) {
  return {
    token,
    runId,
    eventKey,
    eventTitle,
    organizer,
    eventId: eventKey,
    participantName,
    productId: "paid-ticket",
    orderId: ids.orderId as string,
    ticketId: ids.ticketId as string,
    runCreatedAt,
    successfulOwnedCurrentRun: true,
  }
}

test("exact cleanup deletes the full current-run graph and leaves foreign fixtures untouched", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const runCreatedAt = Date.now()
  const { token, userId } = await adminTokenFor(t)
  const userToken = (await adminTokenFor(t, "user")).token
  const ids = await fullFixtureGraph(t, now)
  const foreignEventId = await t.run((ctx) =>
    ctx.db.insert("catalogEvents", {
      ...eventData(now),
      eventKey: "real-event",
      title: "Real event",
      organizer: "Real organizer",
    }),
  )
  const foreignOrderId = await t.run((ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: "foreign-checkout",
      customerGivenName: "Jane",
      customerFamilyName: "Doe",
      customerEmail: "jane@example.com",
      contactSnapshotJson: "{}",
      eventKey: "real-event",
      eventTitle: "Real event",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      organizer: "Real organizer",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2400,
      feeCents: 0,
      totalCents: 2400,
      checkoutContextJson: "{}",
      paymentReference: "foreign-payment",
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: 0,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const foreignFileId = await t.run((ctx) =>
    ctx.db.insert("files", {
      userId,
      fileId: "foreign-file",
      displayName: "https://example.com/foreign.pdf",
      fileSize: 10,
      contentType: "application/pdf",
      url: "https://example.com/foreign.pdf",
      createdAt: now,
      updatedAt: now,
    }),
  )
  const args = exactArgs(token, runCreatedAt, ids)
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, token: userToken })).success).toBe(false)
  const cleaned = await t.mutation(api.catalog.catalogE2eCleanupMutation, args)
  expect(cleaned).toMatchObject({
    success: true,
    data: {
      eventKey,
      eventDeleted: true,
      alreadyCleaned: false,
      product: "deleted",
      deletedOrders: 1,
      deletedTickets: 1,
      deletedCheckInHistory: 2,
      paidHistory: "deleted",
      externalArtifacts: "stripe-imap-pdf-reconciled-separately",
    },
  })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", ids.eventId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", ids.tierId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", ids.orderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketIssued", ids.ticketId))).toBeNull()
  const children = await t.run(async (ctx) => ({
    lines: await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", ids.orderId))
      .take(2),
    reservations: await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", ids.orderId))
      .take(2),
    attempts: await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("orderId", (q) => q.eq("orderId", ids.orderId))
      .take(2),
    deliveries: await ctx.db
      .query("ticketOrderDeliveries")
      .withIndex("orderId", (q) => q.eq("orderId", ids.orderId))
      .take(2),
    fulfillment: await ctx.db
      .query("ticketFulfillmentWork")
      .withIndex("orderId", (q) => q.eq("orderId", ids.orderId))
      .take(2),
    history: await ctx.db
      .query("ticketCheckInHistory")
      .withIndex("ticketIdAndOccurredAt", (q) => q.eq("ticketId", ids.ticketId))
      .take(3),
    eventOrders: await ctx.db
      .query("ticketOrders")
      .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", eventKey))
      .take(2),
    eventTickets: await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", eventKey))
      .take(2),
  }))
  expect(children).toMatchObject({
    lines: [],
    reservations: [],
    attempts: [],
    deliveries: [],
    fulfillment: [],
    history: [],
    eventOrders: [],
    eventTickets: [],
  })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", foreignEventId))).toMatchObject({
    eventKey: "real-event",
    status: "published",
  })
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", foreignOrderId))).toMatchObject({
    checkoutKey: "foreign-checkout",
  })
  expect(await t.run((ctx) => ctx.db.get("files", foreignFileId))).toMatchObject({ fileId: "foreign-file" })
})

test("exact cleanup is idempotent and verifies absence on re-entry", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const runCreatedAt = Date.now()
  const { token } = await adminTokenFor(t)
  const ids = await fullFixtureGraph(t, now)
  const args = exactArgs(token, runCreatedAt, ids)
  expect((await t.mutation(api.catalog.catalogE2eCleanupMutation, args)).success).toBe(true)
  const repeated = await t.mutation(api.catalog.catalogE2eCleanupMutation, args)
  expect(repeated).toMatchObject({
    success: true,
    data: { eventDeleted: true, alreadyCleaned: true, deletedOrders: 0 },
  })
  expect(
    (await t.mutation(api.catalog.catalogE2eCleanupMutation, { ...args, eventKey: "ticket-e2e-wrong" })).success,
  ).toBe(false)
})

test("historical sweep deletes stale legacy fixtures without checkpoint identities and retains current runs", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const ids = await fullFixtureGraph(t, now)
  // Simulate the legacy archive-only outcome: event archived, sold tier archived, order graph retained.
  await t.run((ctx) => ctx.db.patch("catalogEvents", ids.eventId, { status: "archived", deletedAt: now }))
  await t.run((ctx) => ctx.db.patch("catalogTicketTiers", ids.tierId, { archivedAt: now }))
  const current = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })
  expect(current).toMatchObject({ success: true, data: { cleaned: [], isDone: true } })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", ids.eventId))).not.toBeNull()
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.isDone).toBe(true)
  expect(swept.data.cleaned).toHaveLength(1)
  expect(swept.data.cleaned[0]).toMatchObject({
    eventKey,
    runId,
    product: "deleted",
    deletedOrders: 1,
    deletedTickets: 1,
    deletedCheckInHistory: 2,
    paidHistory: "deleted",
  })
  expect(swept.data.skipped).toEqual([])
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", ids.eventId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", ids.tierId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", ids.orderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketIssued", ids.ticketId))).toBeNull()
  const resweep = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(resweep).toMatchObject({ success: true, data: { cleaned: [], skipped: [], isDone: true } })
})

test("historical sweep skips live-provider and foreign fixtures while the orphan sweep deletes orphaned test orders", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const liveIds = await fullFixtureGraph(t, now, { stripeMode: "live" })
  const foreignEventId = await t.run((ctx) =>
    ctx.db.insert("catalogEvents", {
      ...eventData(now),
      eventKey: "real-event",
      title: "Real event",
      organizer: "Real organizer",
    }),
  )
  const orphanRunId = "orphan-12345678-1234-1234-1234-123456789abc"
  const orphanEventKey = `ticket-e2e-${orphanRunId}`
  const orphanOrderId = await t.run((ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: "orphan-checkout",
      customerGivenName: "E2E",
      customerFamilyName: orphanRunId,
      customerEmail: "test@example.com",
      contactSnapshotJson: "{}",
      eventKey: orphanEventKey,
      eventTitle: `Ticket E2E ${orphanRunId}`,
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      organizer: `Eventoren Ticket E2E ${orphanRunId}`,
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 2400,
      feeCents: 0,
      totalCents: 2400,
      checkoutContextJson: "{}",
      paymentReference: "orphan-payment",
      stripeMode: "test",
      status: "expired",
      paymentStatus: "expired",
      reservationExpiresAt: 0,
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketOrderLines", {
      orderId: orphanOrderId,
      tierId: liveIds.tierId,
      eventKey: orphanEventKey,
      tierKey: "paid-ticket",
      tierName: `Paid ticket ${orphanRunId}`,
      tierDescription: "",
      quantity: 1,
      participantNamesJson: JSON.stringify([`E2E Participant ${orphanRunId}`]),
      priceCents: 2400,
      feeCents: 0,
      createdAt: now,
    }),
  )
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned).toEqual([])
  expect(swept.data.skipped.map((entry) => entry.eventKey)).toContain(eventKey)
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", liveIds.eventId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", liveIds.orderId))).toMatchObject({ stripeMode: "live" })
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", foreignEventId))).toMatchObject({ eventKey: "real-event" })
  const orphans = await t.mutation(api.catalog.catalogE2eHistoricalOrphanOrderCleanupMutation, {
    token,
    staleAfterMs: 0,
  })
  expect(orphans).toMatchObject({
    success: true,
    data: { isDone: true, orphanOrdersDeleted: 1, orphanTicketsDeleted: 0 },
  })
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", orphanOrderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", liveIds.orderId))).toMatchObject({ stripeMode: "live" })
})

test("historical sweeps require admin authentication", async () => {
  const t = convexTest(schema, modules)
  const { token } = await adminTokenFor(t, "user")
  expect((await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })).success).toBe(false)
  expect((await t.mutation(api.catalog.catalogE2eHistoricalOrphanOrderCleanupMutation, { token })).success).toBe(false)
})
