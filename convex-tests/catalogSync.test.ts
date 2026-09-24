/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../convex/_generated/api.js"
import type { Doc } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { catalogSyncLimits } from "../src/catalog/convex/catalogSyncLimits.ts"
import { catalogSyncSnapshotPayloadBytesCalculate } from "../src/catalog/convex/catalogSyncSnapshotPayloadBytesCalculate.ts"

const modules = import.meta.glob("../convex/**/*.ts")

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  delete process.env.EVENTOREN_BILLING_BASE_URL
  delete process.env.EVENTOREN_BILLING_ORGANIZATION_ID
  delete process.env.EVENTOREN_BILLING_API_CREDENTIAL
  delete process.env.EVENTOREN_BILLING_STRIPE_MODE
  delete process.env.EVENTOREN_PUBLIC_BASE_URL
})

type CatalogEventInsert = Omit<Doc<"catalogEvents">, "_id" | "_creationTime">

function catalogEventInsert(index: number, overrides: Partial<CatalogEventInsert> = {}): CatalogEventInsert {
  return {
    eventKey: `event-${index.toString().padStart(3, "0")}`,
    title: `Event ${index}`,
    subtitle: "Snapshot test event",
    description: "A bounded snapshot test event",
    category: "konzerte",
    startsAt: `2027-01-${((index % 9) + 1).toString().padStart(2, "0")}T18:00:00.000Z`,
    endsAt: "2027-01-10T22:00:00.000Z",
    doorsAt: "2027-01-10T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Test event",
    tags: ["test"],
    status: "published",
    catalogVersion: 1,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
    ...overrides,
  }
}

async function seedCatalog(t: ReturnType<typeof convexTest>, eventCount: number, version = 1) {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Snapshot test admin",
      role: "admin",
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    }),
  )
  await t.run(async (ctx) => {
    for (let index = eventCount - 1; index >= 0; index -= 1) {
      const eventId = await ctx.db.insert("catalogEvents", catalogEventInsert(index, { catalogVersion: version }))
      await ctx.db.insert("catalogTicketTiers", {
        eventId,
        tierKey: "standard",
        name: "Standard",
        description: "General admission",
        priceCents: 2500,
        feeCents: 250,
        capacity: 100,
        reserved: 0,
        sold: 0,
        sortOrder: 0,
        catalogVersion: version,
        createdAt: "2026-09-15T00:00:00.000Z",
        updatedAt: "2026-09-15T00:00:00.000Z",
      })
    }
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version,
      status: "pending",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: "2026-09-15T00:00:00.000Z",
    })
  })
  return userId
}

async function buildUntilReady(t: ReturnType<typeof convexTest>, version: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, {
      requestedVersion: version,
    })
    expect(result.success).toBe(true)
    if (result.success && result.data.status === "ready") return result.data
  }
  throw new Error("Snapshot did not become ready")
}

async function readSnapshotEvents(t: ReturnType<typeof convexTest>, version: number) {
  const events: Record<string, unknown>[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await t.query(internal.catalog.catalogSyncSnapshotQuery, {
      requestedVersion: version,
      ...(cursor ? { cursor } : {}),
    })
    expect(page).not.toBeNull()
    if (!page) return events
    expect(page.events.length).toBeLessThanOrEqual(catalogSyncLimits.snapshotQueryPageSize)
    events.push(...page.events)
    if (page.isDone) return events
    cursor = page.continueCursor
  }
}

test("requests a full snapshot refresh without editing catalog events", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  const userId = await seedCatalog(t, 1, 3)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const payload = JSON.parse(typeof init?.body === "string" ? init.body : "{}") as {
        catalogVersion: number
        events: unknown[]
      }
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify({ catalogVersion: payload.catalogVersion, events: payload.events })),
      )
      const catalogDigest = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            catalogVersion: payload.catalogVersion,
            catalogDigest,
            eventCount: payload.events.length,
            replayed: false,
          },
        }),
        { status: 200 },
      )
    }),
  )

  const request = await t.mutation(internal.catalog.catalogSyncRefreshRequestMutation, { expectedVersion: 3 })

  expect(request).toEqual({ requested: true, requestedVersion: 4 })
  expect(
    await t.run(async (ctx) => {
      const state = await ctx.db
        .query("catalogSyncStates")
        .withIndex("key", (q) => q.eq("key", "catalog"))
        .unique()
      const events = await ctx.db.query("catalogEvents").collect()
      const snapshot = await ctx.db
        .query("catalogSyncSnapshots")
        .withIndex("version", (q) => q.eq("version", 4))
        .unique()
      return {
        state: state && {
          version: state.version,
          status: state.status,
          lastChangedByUserId: state.lastChangedByUserId,
        },
        events: events.map(({ catalogVersion, eventRevision }) => ({ catalogVersion, eventRevision })),
        snapshot: snapshot && { version: snapshot.version, status: snapshot.status },
      }
    }),
  ).toEqual({
    state: { version: 4, status: "pending", lastChangedByUserId: userId },
    events: [{ catalogVersion: 3, eventRevision: undefined }],
    snapshot: { version: 4, status: "building" },
  })

  expect(await t.mutation(internal.catalog.catalogSyncRefreshRequestMutation, { expectedVersion: 3 })).toEqual({
    requested: false,
    currentVersion: 4,
  })
  await t.finishAllScheduledFunctions(vi.runAllTimers)
})

test("builds a stable indexed snapshot in bounded batches and pages", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 33)

  const built = await buildUntilReady(t, 1)
  expect(built.eventCount).toBe(33)
  expect(built.chunkCount).toBe(33)

  const events = await readSnapshotEvents(t, 1)
  expect(events.map((event) => event.eventRevision)).toEqual(Array.from({ length: 33 }, () => 1))
  expect(
    await t.run(async (ctx) =>
      (await ctx.db.query("catalogEvents").collect()).every((event) => event.eventRevision === 1),
    ),
  ).toBe(true)
  expect(events.map((event) => event.eventKey)).toEqual(
    Array.from({ length: 33 }, (_, index) => `event-${index.toString().padStart(3, "0")}`),
  )
  expect(new Set(events.map((event) => event.eventKey)).size).toBe(33)
  const firstPage = await t.query(internal.catalog.catalogSyncSnapshotQuery, { requestedVersion: 1 })
  expect(firstPage?.payloadBytes).toBe(
    new TextEncoder().encode(JSON.stringify({ catalogVersion: 1, events })).byteLength,
  )

  const chunks = await t.run(async (ctx) =>
    ctx.db
      .query("catalogSyncSnapshotChunks")
      .withIndex("versionAndChunkIndex", (q) => q.eq("version", 1))
      .collect(),
  )
  expect(chunks).toHaveLength(33)
  expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(Array.from({ length: 33 }, (_, index) => index))
})

test("archived ticket products are excluded from the Billing catalog snapshot", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 1)
  await t.run(async (ctx) => {
    const tier = await ctx.db.query("catalogTicketTiers").first()
    if (!tier) throw new Error("tier missing")
    await ctx.db.patch("catalogTicketTiers", tier._id, { archivedAt: "2026-09-15T00:01:00.000Z", sold: 1 })
  })

  await buildUntilReady(t, 1)

  expect((await readSnapshotEvents(t, 1))[0]?.tiers).toEqual([])
})

test("retries reuse immutable version chunks and requestedVersion selects that version", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 1)
  await buildUntilReady(t, 1)
  const before = await t.run(async (ctx) => ctx.db.query("catalogSyncSnapshotChunks").collect())

  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "event-000"))
      .unique()
    if (!event) throw new Error("event missing")
    await ctx.db.patch("catalogEvents", event._id, { title: "Live row changed" })
  })

  const retry = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, { requestedVersion: 1 })
  expect(retry).toMatchObject({ success: true, data: { status: "ready", eventCount: 1, chunkCount: 1 } })
  const after = await t.run(async (ctx) => ctx.db.query("catalogSyncSnapshotChunks").collect())
  expect(after).toEqual(before)
  expect((await readSnapshotEvents(t, 1))[0]?.title).toBe("Event 0")
  expect(await t.query(internal.catalog.catalogSyncSnapshotQuery, { requestedVersion: 2 })).toBeNull()
})

test("stops an old builder at a concurrent version and does not publish partial chunks", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, catalogSyncLimits.buildEventsPerBatch + 1)
  const firstBatch = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, { requestedVersion: 1 })
  expect(firstBatch).toMatchObject({ success: true, data: { status: "building" } })

  await t.run(async (ctx) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!state) throw new Error("sync state missing")
    await ctx.db.patch("catalogSyncStates", state._id, { version: 2, updatedAt: "2026-09-15T00:01:00.000Z" })
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "event-000"))
      .unique()
    if (!event) throw new Error("event missing")
    await ctx.db.patch("catalogEvents", event._id, { title: "Version two" })
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 2,
      status: "building",
      nextChunkIndex: 0,
      eventCount: 0,
      chunkCount: 0,
      payloadBytes: catalogSyncSnapshotPayloadBytesCalculate(2, 0, 0),
      updatedAt: "2026-09-15T00:01:00.000Z",
    })
  })

  const stale = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, { requestedVersion: 1 })
  expect(stale).toMatchObject({ success: true, data: { status: "stale", currentVersion: 2 } })
  expect(await t.query(internal.catalog.catalogSyncSnapshotQuery, { requestedVersion: 1 })).toBeNull()
  const oldChunks = await t.run(async (ctx) =>
    ctx.db
      .query("catalogSyncSnapshotChunks")
      .withIndex("versionAndChunkIndex", (q) => q.eq("version", 1))
      .collect(),
  )
  expect(oldChunks).toHaveLength(catalogSyncLimits.buildEventsPerBatch)
})

test("retries the same billing payload and preserves version idempotency", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 2)
  await buildUntilReady(t, 1)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"

  const bodies: string[] = []
  let callCount = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : ""
      bodies.push(body)
      const payload = JSON.parse(body) as { catalogVersion: number; events: unknown[] }
      callCount += 1
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify({ catalogVersion: payload.catalogVersion, events: payload.events })),
      )
      const catalogDigest = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            catalogVersion: payload.catalogVersion,
            catalogDigest,
            eventCount: payload.events.length,
            replayed: callCount > 1,
          },
        }),
        { status: 200 },
      )
    }),
  )

  const first = await t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 })
  const second = await t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 })
  expect(first).toMatchObject({ success: true, data: { catalogVersion: 1, replayed: false } })
  expect(second).toMatchObject({ success: true, data: { catalogVersion: 1, replayed: true } })
  expect(bodies).toHaveLength(2)
  expect(bodies[0]).toBe(bodies[1])
  expect(JSON.parse(bodies[0] ?? "{}")).toMatchObject({
    catalogVersion: 1,
    events: [{ eventKey: "event-000" }, { eventKey: "event-001" }],
  })
})

test("rejects malformed and cross-version snapshot cursors without scanning the snapshot", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 2)
  await buildUntilReady(t, 1)

  expect(
    await t.query(internal.catalog.catalogSyncSnapshotQuery, { requestedVersion: 1, cursor: "not-json" }),
  ).toBeNull()
  const first = await t.query(internal.catalog.catalogSyncSnapshotQuery, { requestedVersion: 1 })
  expect(first).not.toBeNull()
  if (!first) return
  expect(
    await t.query(internal.catalog.catalogSyncSnapshotQuery, {
      requestedVersion: 1,
      cursor: JSON.stringify({ version: 1, catalogVersion: 2, sourceCursor: first.continueCursor }),
    }),
  ).toBeNull()
})

test("concurrent retries send the same immutable atomic Billing request", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 2)
  await buildUntilReady(t, 1)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"

  const bodies: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : ""
      bodies.push(body)
      const payload = JSON.parse(body) as { catalogVersion: number; events: unknown[] }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            catalogVersion: payload.catalogVersion,
            catalogDigest: "a".repeat(64),
            eventCount: payload.events.length,
            replayed: bodies.length > 1,
          },
        }),
        { status: 200 },
      )
    }),
  )

  const results = await Promise.all([
    t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 }),
    t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 }),
  ])
  expect(results.every((result) => result.success)).toBe(true)
  expect(bodies).toHaveLength(2)
  expect(bodies[0]).toBe(bodies[1])
})

test("retries a failed Billing request from the same ready snapshot", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 1)
  await buildUntilReady(t, 1)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"

  const bodies: string[] = []
  let callCount = 0
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(typeof init?.body === "string" ? init.body : "")
      callCount += 1
      if (callCount === 1) return new Response("temporary failure", { status: 503 })
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            catalogVersion: 1,
            catalogDigest: "c".repeat(64),
            eventCount: 1,
            replayed: false,
          },
        }),
        { status: 200 },
      )
    }),
  )

  const first = await t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 })
  const retry = await t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 })
  expect(first).toMatchObject({ success: false })
  expect(retry).toMatchObject({ success: true, data: { catalogVersion: 1 } })
  expect(bodies).toHaveLength(2)
  expect(bodies[0]).toBe(bodies[1])
})

test.each([400, 409, 413])("does not retry terminal Billing HTTP %s errors", async (status) => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 1)
  await buildUntilReady(t, 1)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status }))
  vi.stubGlobal("fetch", fetchMock)

  const result = await t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 })

  expect(result).toMatchObject({ success: false })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const syncState = await t.run(async (ctx) => ctx.db.query("catalogSyncStates").withIndex("key").unique())
  expect(syncState).toMatchObject({ status: "failed", attempts: 1 })
  const scheduledJobs = await t.query(internal.testFixtureJobs.testFixtureJobs, {})
  expect(scheduledJobs.filter((job) => job.state.kind === "pending")).toHaveLength(0)
})

test("rejects a snapshot over the bounded Billing payload before assembling its pages", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 2)
  await buildUntilReady(t, 1)
  await t.run(async (ctx) => {
    const snapshot = await ctx.db
      .query("catalogSyncSnapshots")
      .withIndex("version", (q) => q.eq("version", 1))
      .unique()
    if (!snapshot) throw new Error("snapshot missing")
    await ctx.db.patch("catalogSyncSnapshots", snapshot._id, {
      payloadBytes: catalogSyncLimits.billingPayloadMaxBytes,
    })
  })
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)

  const result = await t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: 1 })
  expect(result).toMatchObject({ success: false })
  expect(fetchMock).not.toHaveBeenCalled()
})

test("rejects an oversized event without publishing partial snapshot chunks", async () => {
  const t = convexTest(schema, modules)
  await seedCatalog(t, 1)
  await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "event-000"))
      .unique()
    if (!event) throw new Error("event missing")
    await ctx.db.patch("catalogEvents", event._id, {
      description: "x".repeat(catalogSyncLimits.snapshotChunkMaxBytes),
    })
  })

  const result = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, { requestedVersion: 1 })
  expect(result).toMatchObject({ success: false })
  const chunks = await t.run(async (ctx) => ctx.db.query("catalogSyncSnapshotChunks").collect())
  expect(chunks).toHaveLength(0)
  expect(await t.query(internal.catalog.catalogSyncSnapshotQuery, { requestedVersion: 1 })).toBeNull()
})
