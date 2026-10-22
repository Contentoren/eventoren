/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "e2e-test-like-cleanup-test-secret"
process.env.AUTH_SECRET = secret

type Fixture = ReturnType<typeof convexTest>

async function adminTokenFor(t: Fixture) {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  return { token: await testAuthSessionTokenCreate(t, userId, secret) }
}

function eventData(now: string, overrides: Record<string, unknown>) {
  return {
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
    ...overrides,
  }
}

function orderData(now: string, overrides: Record<string, unknown>) {
  return {
    checkoutKey: "test-like-checkout",
    customerGivenName: "E2E",
    customerFamilyName: "Old Family",
    customerEmail: "test@example.com",
    contactSnapshotJson: "{}",
    legalDocumentSetRevision: "accepted-v1",
    legalTermsMarkdown: "Accepted terms remain immutable",
    eventSubtitle: "",
    eventDescription: "",
    eventStartsAt: now,
    eventEndsAt: now,
    eventDoorsAt: now,
    venue: "Test",
    city: "Berlin",
    address: "Test",
    imageUrl: "",
    imageAlt: "",
    catalogVersion: 1,
    subtotalCents: 2400,
    feeCents: 0,
    totalCents: 2400,
    checkoutContextJson: "{}",
    paymentReference: "test-like-payment",
    billingOrderReference: "billing-test-like",
    stripeMode: "test",
    status: "paid" as const,
    paymentStatus: "paid" as const,
    reservationExpiresAt: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

async function testLikeEventGraph(
  t: Fixture,
  now: string,
  event: { eventKey: string; title: string; organizer: string },
  orderStripeMode: "test" | "live" = "test",
) {
  const eventId = await t.run((ctx) => ctx.db.insert("catalogEvents", eventData(now, event)))
  const tierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "general",
      name: "General",
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
    ctx.db.insert(
      "ticketOrders",
      orderData(now, {
        eventKey: event.eventKey,
        eventTitle: event.title,
        organizer: event.organizer,
        stripeMode: orderStripeMode,
      }),
    ),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId,
      eventKey: event.eventKey,
      tierKey: "general",
      tierName: "General",
      tierDescription: "",
      quantity: 1,
      participantNamesJson: JSON.stringify(["E2E Tester"]),
      priceCents: 2400,
      feeCents: 0,
      createdAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: "test-like-payment",
      billingOrderReference: "billing-test-like",
      stripeMode: orderStripeMode,
      status: "paid" as const,
      createdAt: now,
      updatedAt: now,
    }),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 1,
      code: "TKT-TESTLIKE-1",
      eventKey: event.eventKey,
      eventTitle: event.title,
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      tierKey: "general",
      tierName: "General",
      priceCents: 2400,
      feeCents: 0,
      participantName: "E2E Tester",
      issuedAt: now,
    }),
  )
  return { eventId, orderId }
}

test("post-success sweep deletes previous-run test-like events and orders", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const driftedRunId = "oldrun11-12345678-1234-1234-1234-123456789abc"
  const drifted = await testLikeEventGraph(t, now, {
    eventKey: `ticket-e2e-${driftedRunId}`,
    title: "Renamed draft from an old run",
    organizer: "Someone renamed me",
  })
  const generic = await testLikeEventGraph(t, now, {
    eventKey: "test-concert-2024",
    title: "Test Concert",
    organizer: "Test organizer",
  })
  const genuineId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      eventData(now, { eventKey: "sommerkonzert-2024", title: "Sommerkonzert", organizer: "Kulturverein" }),
    ),
  )

  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) throw new Error("expected success")
  expect(swept.data.cleaned.map((entry) => entry.eventKey).sort()).toEqual(
    [`ticket-e2e-${driftedRunId}`, "test-concert-2024"].sort(),
  )
  expect(swept.data.cleaned.every((entry) => entry.kind === "test-like")).toBe(true)
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", drifted.eventId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", generic.eventId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", drifted.orderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", generic.orderId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", genuineId))).not.toBeNull()

  const rediscovered = await t.query(api.catalog.catalogE2eHistoricalDiscoveryQuery, { token })
  expect(rediscovered.success).toBe(true)
  if (!rediscovered.success) throw new Error("expected success")
  expect(rediscovered.data.candidates).toEqual([])
})

test("routine sweep leaves drifted test-like fixtures untouched", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const driftedRunId = "oldrun22-12345678-1234-1234-1234-123456789abc"
  const drifted = await testLikeEventGraph(t, now, {
    eventKey: `ticket-e2e-${driftedRunId}`,
    title: "Renamed draft from an old run",
    organizer: "Someone renamed me",
  })

  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token })
  expect(swept.success).toBe(true)
  if (!swept.success) throw new Error("expected success")
  expect(swept.data.cleaned).toEqual([])
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", drifted.eventId))).not.toBeNull()
})

test("post-success sweep refuses test-like events with live revenue", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const live = await testLikeEventGraph(
    t,
    now,
    { eventKey: "test-concert-live", title: "Test Concert", organizer: "Test organizer" },
    "live",
  )

  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) throw new Error("expected success")
  expect(swept.data.cleaned).toEqual([])
  expect(swept.data.skipped.map((entry) => entry.eventKey)).toContain("test-concert-live")
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", live.eventId))).not.toBeNull()
})

test("post-success orphan sweep deletes previous-run test-like orders without events", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const holderEventId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      eventData(now, { eventKey: "test-concert-holder", title: "Holder", organizer: "Holder" }),
    ),
  )
  const holderTierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId: holderEventId,
      tierKey: "general",
      name: "General",
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
  const orderId = await t.run((ctx) =>
    ctx.db.insert(
      "ticketOrders",
      orderData(now, {
        eventKey: "test-concert-orphan",
        eventTitle: "Test Concert Orphan",
        organizer: "Test organizer",
        status: "reserved",
        paymentStatus: "pending",
      }),
    ),
  )
  await t.run((ctx) =>
    ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId: holderTierId,
      eventKey: "test-concert-orphan",
      tierKey: "general",
      tierName: "General",
      tierDescription: "",
      quantity: 1,
      participantNamesJson: JSON.stringify(["E2E Tester"]),
      priceCents: 2400,
      feeCents: 0,
      createdAt: now,
    }),
  )

  const swept = await t.mutation(api.catalog.catalogE2eHistoricalOrphanOrderCleanupMutation, {
    token,
    staleAfterMs: 0,
  })
  expect(swept.success).toBe(true)
  if (!swept.success) throw new Error("expected success")
  expect(swept.data.orphanOrdersDeleted).toBe(1)
  expect(await t.run((ctx) => ctx.db.get("ticketOrders", orderId))).toBeNull()

  const rediscovered = await t.query(api.catalog.catalogE2eHistoricalOrphanDiscoveryQuery, { token })
  expect(rediscovered.success).toBe(true)
  if (!rediscovered.success) throw new Error("expected success")
  expect(rediscovered.data.candidates).toEqual([])
})

test("discovery inventories drifted test-like candidates without deleting", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const driftedRunId = "oldrun33-12345678-1234-1234-1234-123456789abc"
  await testLikeEventGraph(t, now, {
    eventKey: `ticket-e2e-${driftedRunId}`,
    title: "Renamed draft from an old run",
    organizer: "Someone renamed me",
  })
  await testLikeEventGraph(t, now, {
    eventKey: "test-concert-generic",
    title: "Test Concert",
    organizer: "Test organizer",
  })

  const discovered = await t.query(api.catalog.catalogE2eHistoricalDiscoveryQuery, { token })
  expect(discovered.success).toBe(true)
  if (!discovered.success) throw new Error("expected success")
  // Discovery is shape-based: a valid run-marker key inventories as
  // ticket-e2e; the test-like kind applies at deletion when exact ownership
  // fails.
  expect(discovered.data.candidates).toEqual([
    { eventKey: `ticket-e2e-${driftedRunId}`, runId: driftedRunId, kind: "ticket-e2e" },
    { eventKey: "test-concert-generic", runId: "test-concert-generic", kind: "test-like" },
  ])
})
