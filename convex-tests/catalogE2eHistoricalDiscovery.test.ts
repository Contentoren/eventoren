/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "e2e-historical-discovery-test-secret"

type Fixture = ReturnType<typeof convexTest>

async function adminTokenFor(t: Fixture) {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  return { token: await testAuthSessionTokenCreate(t, userId, secret) }
}

function baseEvent(now: string, overrides: Record<string, unknown>) {
  return {
    title: "Fixture",
    subtitle: "",
    description: "",
    category: "test",
    startsAt: now,
    endsAt: now,
    doorsAt: now,
    venue: "Test",
    city: "Berlin",
    address: "Test",
    organizer: "Test organizer",
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

test("pre-deletion discovery inventories fixture shapes without deleting", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const runId = "mold-12345678-1234-1234-1234-123456789abc"
  await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: `ticket-e2e-${runId}`,
        title: `Ticket E2E ${runId}`,
        organizer: `Eventoren Ticket E2E ${runId}`,
      }),
    ),
  )
  await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: "native-auth-12345678-1234-1234-1234-123456789abc",
        title: "[native-auth-e2e:mtest:12345678-1234-1234-1234-123456789abc] lifecycle edited",
      }),
    ),
  )
  const legacySingleRunId = "muwdpyqv-49622e87-f4ee-4cf8-a487-26c874d1283b"
  await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: `native-auth-${legacySingleRunId}`,
        title: `[native-auth-e2e:${legacySingleRunId}] lifecycle edited`,
      }),
    ),
  )
  const discovered = await t.query(api.catalog.catalogE2eHistoricalDiscoveryQuery, { token })
  expect(discovered.success).toBe(true)
  if (!discovered.success) return
  expect(discovered.data.candidates.map((entry: { eventKey: string }) => entry.eventKey)).toContain(
    `ticket-e2e-${runId}`,
  )
  expect(discovered.data.candidates.map((entry: { eventKey: string }) => entry.eventKey)).toContain(
    "native-auth-12345678-1234-1234-1234-123456789abc",
  )
  expect(discovered.data.candidates.map((entry: { eventKey: string }) => entry.eventKey)).toContain(
    `native-auth-${legacySingleRunId}`,
  )
  expect(discovered.data.isDone).toBe(true)
  const remaining = await t.run((ctx) => ctx.db.query("catalogEvents").take(5))
  expect(remaining.length).toBe(3)
})

test("orphan discovery inventories event-absent E2E orders without deleting", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  const runId = "mold-12345678-1234-1234-1234-123456789abc"
  await t.run((ctx) =>
    ctx.db.insert("ticketOrders", {
      checkoutKey: "orphan-checkout",
      customerGivenName: "E2E",
      customerFamilyName: runId,
      customerEmail: "test@example.com",
      contactSnapshotJson: "{}",
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Test",
      city: "Berlin",
      address: "Test",
      organizer: `Eventoren Ticket E2E ${runId}`,
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 100,
      feeCents: 0,
      totalCents: 100,
      checkoutContextJson: "{}",
      paymentReference: "pay-orphan",
      stripeMode: "test" as const,
      status: "reserved" as const,
      paymentStatus: "pending" as const,
      reservationExpiresAt: 0,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const discovered = await t.query(api.catalog.catalogE2eHistoricalOrphanDiscoveryQuery, { token })
  expect(discovered.success).toBe(true)
  if (!discovered.success) return
  expect(discovered.data.candidates).toMatchObject([{ eventKey: `ticket-e2e-${runId}` }])
  const remaining = await t.run((ctx) => ctx.db.query("ticketOrders").take(5))
  expect(remaining.length).toBe(1)
})

test("unbounded scanner links fail truncated instead of silently reporting no-op success", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const nowMs = Date.now()
  const { token } = await adminTokenFor(t)
  for (let index = 0; index < 101; index++) {
    await t.run((ctx) =>
      ctx.db.insert("scannerLinks", {
        code: `link-${index}`,
        name: `link ${index}`,
        role: "organizer" as const,
        eventKeys: ["readiness-technical-draft-20260914"],
        expiresAt: nowMs + 3600_000,
        createdAt: nowMs,
      }),
    )
  }
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.truncated).toBe(true)
  expect(swept.data.skipped.map((entry: { eventKey: string }) => entry.eventKey)).toContain("scanner-links")
  const remaining = await t.run((ctx) => ctx.db.query("scannerLinks").take(5))
  expect(remaining.length).toBeGreaterThan(0)
})
