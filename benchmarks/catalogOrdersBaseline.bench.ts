/// <reference types="vite/client" />

import { mkdir, writeFile } from "node:fs/promises"
import { arch, cpus, hostname, platform, release, totalmem } from "node:os"
import { dirname } from "node:path"
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-catalog-orders-benchmark-secret"
const repeatCount = Number.parseInt(process.env.BENCHMARK_REPEAT_COUNT ?? "5", 10)
const seedBatchSize = 25
const outputPath = process.env.BENCHMARK_OUTPUT ?? "/tmp/eventoren-catalog-orders-baseline.json"
process.env.AUTH_SECRET = authSecret

type FixtureSpec = {
  name: string
  recordCount: number
  publishedCount: number
  targetOrderCount: number
  sparse: boolean
}

type MemorySnapshot = {
  sampledAt: string
  rssBytes: number | null
  heapUsedBytes: number | null
}

type SeededFixture = {
  targetUserId: Id<"users">
  targetOrderId: Id<"ticketOrders">
  eventIdForInvalidation: Id<"catalogEvents">
  seedTransactionCount: number
}

type EndpointMeasurement = {
  endpoint: string
  expectedRecordsPerRun: number
  repeatCount: number
  warmupDurationMs: number
  latencyMs: {
    min: number
    median: number
    p95: number
    max: number
  }
  returnedPayloadBytes: {
    min: number
    mean: number
    max: number
  }
  observedRecordCounts: number[]
  errors: string[]
  workloadProcessBaseline: MemorySnapshot
  workloadProcessPeak: MemorySnapshot
  workloadProcessPeakDelta: {
    rssBytes: number | null
    heapUsedBytes: number | null
  }
  gcAvailable: boolean
}

type ScenarioResult = {
  name: string
  recordCount: number
  publishedCount: number
  targetOrderCount: number
  seedTransactionCount: number
  fixtureSetupDurationMs: number
  fixtureProcessBaseline: MemorySnapshot
  fixtureProcessAfterSetup: MemorySnapshot
  fixtureSetupProcessPeak: MemorySnapshot
  processPeakDuringFixtureAndWorkloads: MemorySnapshot
  catalogSync: {
    buildDurationMs: number
    eventCount: number
    chunkCount: number
    payloadBytes: number
    largestBillingRequestBytes: number
  }
  measurements: EndpointMeasurement[]
  invalidation: {
    verified: boolean
    details?: {
      catalogListBefore: number
      catalogListAfter: number
      snapshotTitle: string
      orderTitle: string
      snapshotRequestedVersion: number
      catalogOrderVerified: boolean
      orderHistoryOrderVerified: boolean
      duplicateRecordsFound: boolean
    }
  }
}

function memorySnapshot(): MemorySnapshot {
  const usage = typeof process.memoryUsage === "function" ? process.memoryUsage() : undefined
  return {
    sampledAt: new Date().toISOString(),
    rssBytes: usage?.rss ?? null,
    heapUsedBytes: usage?.heapUsed ?? null,
  }
}

function nullableMaximum(left: number | null, right: number | null): number | null {
  if (left === null) return right
  if (right === null) return left
  return Math.max(left, right)
}

function maximumMemory(left: MemorySnapshot, right: MemorySnapshot): MemorySnapshot {
  const leftRss = left.rssBytes ?? -1
  const rightRss = right.rssBytes ?? -1
  const leftHeap = left.heapUsedBytes ?? -1
  const rightHeap = right.heapUsedBytes ?? -1
  return {
    sampledAt: leftRss >= rightRss && leftHeap >= rightHeap ? left.sampledAt : right.sampledAt,
    rssBytes: nullableMaximum(left.rssBytes, right.rssBytes),
    heapUsedBytes: nullableMaximum(left.heapUsedBytes, right.heapUsedBytes),
  }
}

function memoryDelta(peak: MemorySnapshot, baseline: MemorySnapshot) {
  return {
    rssBytes: peak.rssBytes === null || baseline.rssBytes === null ? null : peak.rssBytes - baseline.rssBytes,
    heapUsedBytes:
      peak.heapUsedBytes === null || baseline.heapUsedBytes === null
        ? null
        : peak.heapUsedBytes - baseline.heapUsedBytes,
  }
}

function gcIfAvailable(): boolean {
  const gc = (globalThis as { gc?: () => void }).gc
  if (!gc) return false
  gc()
  return true
}

function memoryTrackerStart() {
  let peak = memorySnapshot()
  const timer = setInterval(() => {
    peak = maximumMemory(peak, memorySnapshot())
  }, 1)
  return {
    stop: () => {
      clearInterval(timer)
      peak = maximumMemory(peak, memorySnapshot())
      return peak
    },
  }
}

function payloadBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value) ?? "null").byteLength
}

function recordCount(value: unknown): number {
  if (Array.isArray(value)) return value.length
  if (typeof value !== "object" || value === null) return 0
  if ("events" in value && Array.isArray(value.events)) return value.events.length
  if ("page" in value && Array.isArray(value.page)) return value.page.length
  if (!("success" in value) || value.success !== true) return 0
  if ("data" in value && Array.isArray(value.data)) return value.data.length
  if (
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "page" in value.data &&
    Array.isArray(value.data.page)
  )
    return value.data.page.length
  if (
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "catalogVersion" in value.data &&
    typeof value.data.catalogVersion === "number"
  )
    return 1
  return 0
}

async function buildCatalogSnapshot(t: ReturnType<typeof convexTest>, requestedVersion: number) {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const result = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, { requestedVersion })
    if (!result.success) throw new Error(result.errorMessage)
    if (result.data.status === "ready") return result.data
  }
  throw new Error(`Catalog snapshot ${requestedVersion} did not become ready`)
}

async function readCatalogSnapshot(t: ReturnType<typeof convexTest>, requestedVersion: number) {
  const events: Record<string, unknown>[] = []
  let cursor: string | undefined
  let pageCount = 0
  for (;;) {
    const page = await t.query(internal.catalog.catalogSyncSnapshotQuery, {
      requestedVersion,
      ...(cursor ? { cursor } : {}),
    })
    if (!page) throw new Error(`Catalog snapshot ${requestedVersion} is missing`)
    events.push(...page.events)
    pageCount += 1
    if (page.isDone) return { events, pageCount }
    cursor = page.continueCursor
  }
}

function resultDataStringFields(value: unknown, field: string): string[] {
  if (typeof value !== "object" || value === null || !("success" in value) || value.success !== true) return []
  if (!("data" in value) || !Array.isArray(value.data)) return []
  return value.data.map((item) => {
    if (typeof item !== "object" || item === null || !(field in item)) return ""
    const fieldValue = item[field as keyof typeof item]
    return typeof fieldValue === "string" ? fieldValue : String(fieldValue)
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  return sorted[index] ?? 0
}

function isoTime(index: number): string {
  return new Date(Date.UTC(2027, 0, 1 + index)).toISOString()
}

async function seedFixture(t: ReturnType<typeof convexTest>, spec: FixtureSpec): Promise<SeededFixture> {
  const now = new Date().toISOString()
  const users = await t.run(async (ctx) => {
    const targetUserId = await ctx.db.insert("users", {
      name: "Benchmark target",
      role: "user",
      createdAt: now,
      updatedAt: now,
    })
    const otherUserId = await ctx.db.insert("users", {
      name: "Benchmark other",
      role: "user",
      createdAt: now,
      updatedAt: now,
    })
    return { targetUserId, otherUserId }
  })
  let seedTransactionCount = 1
  const eventIds: Id<"catalogEvents">[] = []
  const tierIdsByEvent: Id<"catalogTicketTiers">[][] = []

  for (let batchStart = 0; batchStart < spec.recordCount; batchStart += seedBatchSize) {
    const batchEnd = Math.min(spec.recordCount, batchStart + seedBatchSize)
    const batch = await t.run(async (ctx) => {
      const eventIds: Id<"catalogEvents">[] = []
      const tierIdsByEvent: Id<"catalogTicketTiers">[][] = []

      for (let index = batchStart; index < batchEnd; index += 1) {
        const startsAt = isoTime(index)
        const eventId = await ctx.db.insert("catalogEvents", {
          eventKey: `benchmark-event-${index.toString().padStart(4, "0")}`,
          title: `Benchmark event ${index}`,
          subtitle: "Representative baseline event",
          description: "A catalog event used only by the local baseline workload.",
          category: "konzerte",
          startsAt,
          endsAt: new Date(Date.parse(startsAt) + 4 * 60 * 60 * 1000).toISOString(),
          doorsAt: new Date(Date.parse(startsAt) - 60 * 60 * 1000).toISOString(),
          venue: "Benchmark hall",
          city: "Berlin",
          address: "Baseline Straße 1",
          organizer: "Eventoren baseline",
          imageUrl: "https://eventoren.test/benchmark.jpg",
          imageAlt: "Benchmark event",
          tags: ["benchmark"],
          status: index < spec.publishedCount ? "published" : "draft",
          catalogVersion: index + 1,
          createdAt: startsAt,
          updatedAt: startsAt,
        })
        eventIds.push(eventId)
        const tierIds: Id<"catalogTicketTiers">[] = []
        for (const tierIndex of [0, 1]) {
          tierIds.push(
            await ctx.db.insert("catalogTicketTiers", {
              eventId,
              tierKey: tierIndex === 0 ? "standard" : "premium",
              name: tierIndex === 0 ? "Standard" : "Premium",
              description: "Representative baseline tier",
              priceCents: tierIndex === 0 ? 2_500 : 5_000,
              feeCents: tierIndex === 0 ? 250 : 500,
              capacity: 1_000,
              reserved: 10,
              sold: 20,
              sortOrder: tierIndex,
              catalogVersion: index + 1,
              createdAt: startsAt,
              updatedAt: startsAt,
            }),
          )
        }
        tierIdsByEvent.push(tierIds)
      }
      return { eventIds, tierIdsByEvent }
    })
    seedTransactionCount += 1
    eventIds.push(...batch.eventIds)
    tierIdsByEvent.push(...batch.tierIdsByEvent)
  }

  const targetOrderIds: Id<"ticketOrders">[] = []
  const orderStatuses = ["paid", "checkout_created", "failed", "expired"] as const
  const paymentStatuses = ["paid", "pending", "failed", "expired"] as const
  for (let batchStart = 0; batchStart < spec.recordCount; batchStart += seedBatchSize) {
    const batchEnd = Math.min(spec.recordCount, batchStart + seedBatchSize)
    const batchTargetOrderIds = await t.run(async (ctx) => {
      const insertedTargetOrderIds: Id<"ticketOrders">[] = []
      for (let index = batchStart; index < batchEnd; index += 1) {
        const eventIndex = index % spec.recordCount
        const tierIds = tierIdsByEvent[eventIndex]
        if (!tierIds) throw new Error(`Missing benchmark event ${eventIndex}`)
        const eventKey = `benchmark-event-${eventIndex.toString().padStart(4, "0")}`
        const createdAt = isoTime(index)
        const statusIndex = index % orderStatuses.length
        const status = orderStatuses[statusIndex] ?? "paid"
        const paymentStatus = paymentStatuses[statusIndex] ?? "paid"
        const orderId = await ctx.db.insert("ticketOrders", {
          checkoutKey: `benchmark-checkout-${index}`,
          ownerUserId: index < spec.targetOrderCount ? users.targetUserId : users.otherUserId,
          customerEmail: `benchmark-${index}@example.com`,
          customerGivenName: "Baseline",
          customerFamilyName: `Customer ${index}`,
          customerPhone: "+491234567890",
          contactSnapshotJson: JSON.stringify({ email: `benchmark-${index}@example.com` }),
          eventKey,
          eventTitle: `Benchmark event ${eventIndex}`,
          eventSubtitle: "Representative baseline event",
          eventDescription: "A catalog event used only by the local baseline workload.",
          eventStartsAt: isoTime(eventIndex),
          eventEndsAt: new Date(Date.parse(isoTime(eventIndex)) + 4 * 60 * 60 * 1000).toISOString(),
          eventDoorsAt: new Date(Date.parse(isoTime(eventIndex)) - 60 * 60 * 1000).toISOString(),
          venue: "Benchmark hall",
          city: "Berlin",
          address: "Baseline Straße 1",
          organizer: "Eventoren baseline",
          imageUrl: "https://eventoren.test/benchmark.jpg",
          imageAlt: "Benchmark event",
          catalogVersion: eventIndex + 1,
          subtotalCents: 7_500,
          feeCents: 750,
          totalCents: 8_250,
          checkoutContextJson: JSON.stringify({ source: "benchmark" }),
          paymentReference: `benchmark-payment-${index}`,
          stripeMode: "test",
          status,
          paymentStatus,
          reservationExpiresAt: Date.now() + 60 * 60 * 1000,
          createdAt,
          updatedAt: createdAt,
          paidAt: status === "paid" ? createdAt : undefined,
        })
        if (index < spec.targetOrderCount) insertedTargetOrderIds.push(orderId)

        const lineCount = index % 3 === 0 ? 1 : 2
        for (let tierIndex = 0; tierIndex < lineCount; tierIndex += 1) {
          const tierId = tierIds[tierIndex]
          if (!tierId) throw new Error(`Missing benchmark tier ${tierIndex} for event ${eventIndex}`)
          const tierKey = tierIndex === 0 ? "standard" : "premium"
          const tierName = tierIndex === 0 ? "Standard" : "Premium"
          await ctx.db.insert("ticketOrderLines", {
            orderId,
            tierId,
            eventKey,
            tierKey,
            tierName,
            tierDescription: "Representative baseline tier",
            quantity: tierIndex === 0 ? 1 : 2,
            priceCents: tierIndex === 0 ? 2_500 : 5_000,
            feeCents: tierIndex === 0 ? 250 : 500,
            createdAt,
          })
          if (status === "paid") {
            const ticketCount = tierIndex === 0 ? 1 : 2
            for (let ticketIndex = 0; ticketIndex < ticketCount; ticketIndex += 1) {
              await ctx.db.insert("ticketIssued", {
                orderId,
                sequence: tierIndex * 2 + ticketIndex + 1,
                ownerUserId: index < spec.targetOrderCount ? users.targetUserId : users.otherUserId,
                code: `BENCHMARK-${index}-${tierIndex}-${ticketIndex}`,
                eventKey,
                eventTitle: `Benchmark event ${eventIndex}`,
                eventStartsAt: isoTime(eventIndex),
                eventDoorsAt: new Date(Date.parse(isoTime(eventIndex)) - 60 * 60 * 1000).toISOString(),
                venue: "Benchmark hall",
                city: "Berlin",
                address: "Baseline Straße 1",
                tierKey,
                tierName,
                priceCents: tierIndex === 0 ? 2_500 : 5_000,
                feeCents: tierIndex === 0 ? 250 : 500,
                issuedAt: createdAt,
              })
            }
          }
        }
      }
      return insertedTargetOrderIds
    })
    seedTransactionCount += 1
    targetOrderIds.push(...batchTargetOrderIds)
  }

  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: spec.recordCount,
      status: "synced",
      syncedVersion: spec.recordCount,
      syncedDigest: "benchmark-digest",
      attempts: 0,
      lastChangedByUserId: users.targetUserId,
      updatedAt: now,
    })
  })
  seedTransactionCount += 1

  const targetOrderId = targetOrderIds[0]
  const eventIdForInvalidation = eventIds[spec.publishedCount < spec.recordCount ? spec.publishedCount : 0]
  if (!targetOrderId || !eventIdForInvalidation) throw new Error("Benchmark fixture did not create required records")
  return {
    targetUserId: users.targetUserId,
    targetOrderId,
    eventIdForInvalidation,
    seedTransactionCount,
  }
}

async function measureEndpoint(
  endpoint: string,
  expectedRecordsPerRun: number,
  invoke: () => Promise<unknown>,
): Promise<EndpointMeasurement> {
  const warmupStartedAt = performance.now()
  await invoke()
  const warmupDurationMs = performance.now() - warmupStartedAt
  const gcAvailable = gcIfAvailable()
  const workloadProcessBaseline = memorySnapshot()
  const tracker = memoryTrackerStart()
  const latencies: number[] = []
  const returnedPayloadBytes: number[] = []
  const observedRecordCounts: number[] = []
  const errors: string[] = []

  for (let index = 0; index < repeatCount; index += 1) {
    const startedAt = performance.now()
    try {
      const output = await invoke()
      latencies.push(performance.now() - startedAt)
      returnedPayloadBytes.push(payloadBytes(output))
      const count = recordCount(output)
      observedRecordCounts.push(count)
      if (count !== expectedRecordsPerRun) {
        errors.push(`run ${index + 1}: expected ${expectedRecordsPerRun} records, got ${count}`)
      }
    } catch (error) {
      errors.push(`run ${index + 1}: ${errorMessage(error)}`)
    }
  }

  const workloadProcessPeak = tracker.stop()
  expect(errors).toEqual([])
  expect(observedRecordCounts).toEqual(Array.from({ length: repeatCount }, () => expectedRecordsPerRun))

  return {
    endpoint,
    expectedRecordsPerRun,
    repeatCount,
    warmupDurationMs,
    latencyMs: {
      min: Math.min(...latencies),
      median: percentile(latencies, 0.5),
      p95: percentile(latencies, 0.95),
      max: Math.max(...latencies),
    },
    returnedPayloadBytes: {
      min: Math.min(...returnedPayloadBytes),
      mean: returnedPayloadBytes.reduce((sum, value) => sum + value, 0) / returnedPayloadBytes.length,
      max: Math.max(...returnedPayloadBytes),
    },
    observedRecordCounts,
    errors,
    workloadProcessBaseline,
    workloadProcessPeak,
    workloadProcessPeakDelta: memoryDelta(workloadProcessPeak, workloadProcessBaseline),
    gcAvailable,
  }
}

async function verifyInvalidation(
  t: ReturnType<typeof convexTest>,
  fixture: SeededFixture,
  token: string,
): Promise<ScenarioResult["invalidation"]> {
  const listBefore = await t.query(api.catalog.catalogEventListPublishedQuery, {})
  const catalogListBefore = Array.isArray(listBefore) ? listBefore.length : 0
  const invalidatedEventBefore = await t.run(async (ctx) => ctx.db.get(fixture.eventIdForInvalidation))
  const previousSyncVersion = await t.run(async (ctx) => {
    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!syncState) throw new Error("Benchmark sync state is missing")
    return syncState.version
  })
  await t.run(async (ctx) => {
    await ctx.db.patch("catalogEvents", fixture.eventIdForInvalidation, {
      status: "published",
      title: "Invalidated benchmark event",
    })
    const syncState = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!syncState) throw new Error("Benchmark sync state is missing")
    await ctx.db.patch("catalogSyncStates", syncState._id, {
      version: 999_999,
      updatedAt: new Date().toISOString(),
    })
    await ctx.db.patch("ticketOrders", fixture.targetOrderId, { eventTitle: "Invalidated benchmark order" })
  })
  const listAfter = await t.query(api.catalog.catalogEventListPublishedQuery, {})
  const invalidatedEvent = await t.run(async (ctx) => ctx.db.get(fixture.eventIdForInvalidation))
  const snapshot = await t.query(internal.catalog.catalogSyncSnapshotQuery, {
    requestedVersion: previousSyncVersion,
  })
  const missingSnapshot = await t.query(internal.catalog.catalogSyncSnapshotQuery, { requestedVersion: 1_234 })
  const orders = await t.query(api.ticketing.ticketOrderListMineQuery, { token })
  const catalogListAfter = Array.isArray(listAfter) ? listAfter.length : 0
  const snapshotTitle = snapshot?.events.find((event) => event.eventKey === invalidatedEvent?.eventKey)?.title ?? ""
  const orderTitle = orders.success
    ? (orders.data.find((order) => order.id === fixture.targetOrderId)?.eventTitle ?? "")
    : ""
  const catalogEventIds = Array.isArray(listAfter) ? listAfter.map((event) => event.id) : []
  const catalogStartsAt = Array.isArray(listAfter) ? listAfter.map((event) => event.startsAt) : []
  const orderCreatedTimes = resultDataStringFields(orders, "createdAt")
  const orderIds = resultDataStringFields(orders, "id")
  const catalogOrderVerified = catalogStartsAt.every(
    (startsAt, index) =>
      index === 0 || (catalogStartsAt[index - 1] !== undefined && catalogStartsAt[index - 1] <= startsAt),
  )
  const orderHistoryOrderVerified = orderCreatedTimes.every(
    (createdAt, index) =>
      index === 0 || (orderCreatedTimes[index - 1] !== undefined && orderCreatedTimes[index - 1] >= createdAt),
  )
  const duplicateRecordsFound =
    new Set(catalogEventIds).size !== catalogEventIds.length || new Set(orderIds).size !== orderIds.length

  expect(catalogListAfter).toBe(catalogListBefore + 1)
  expect(snapshotTitle).toBe(invalidatedEventBefore?.title)
  expect(missingSnapshot).toBeNull()
  expect(orderTitle).toBe("Invalidated benchmark order")
  expect(snapshot?.requestedVersion).toBe(previousSyncVersion)
  expect(catalogOrderVerified).toBe(true)
  expect(orderHistoryOrderVerified).toBe(true)
  expect(duplicateRecordsFound).toBe(false)

  return {
    verified: true,
    details: {
      catalogListBefore,
      catalogListAfter,
      snapshotTitle,
      orderTitle,
      snapshotRequestedVersion: previousSyncVersion,
      catalogOrderVerified,
      orderHistoryOrderVerified,
      duplicateRecordsFound,
    },
  }
}

async function runScenario(spec: FixtureSpec): Promise<ScenarioResult> {
  console.log(`Starting ${spec.name} fixture setup (${spec.recordCount} events and orders)`)
  const t = convexTest(schema, modules)
  const fixtureProcessBaseline = memorySnapshot()
  const setupStartedAt = performance.now()
  const setupTracker = memoryTrackerStart()
  const fixture = await seedFixture(t, spec)
  const fixtureSetupProcessPeak = setupTracker.stop()
  const fixtureSetupDurationMs = performance.now() - setupStartedAt
  const fixtureProcessAfterSetup = memorySnapshot()
  const token = await createToken(fixture.targetUserId, authSecret)
  const snapshotBuildStartedAt = performance.now()
  const snapshot = await buildCatalogSnapshot(t, spec.recordCount)
  const snapshotBuildDurationMs = performance.now() - snapshotBuildStartedAt
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "benchmark-credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  let largestBillingRequestBytes = 0
  globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : ""
    largestBillingRequestBytes = Math.max(largestBillingRequestBytes, new TextEncoder().encode(body).byteLength)
    const request = JSON.parse(body) as { catalogVersion: number; events: unknown[] }
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          catalogVersion: request.catalogVersion,
          catalogDigest: "d".repeat(64),
          eventCount: request.events.length,
          replayed: true,
        },
      }),
      { status: 200 },
    )
  }
  const measurements = [
    await measureEndpoint("catalogEventListPublishedQuery", spec.publishedCount, () =>
      t.query(api.catalog.catalogEventListPublishedQuery, {}),
    ),
    await measureEndpoint("catalogEventListPublishedPageQuery", Math.min(50, spec.publishedCount), () =>
      t.query(api.catalog.catalogEventListPublishedPageQuery, {
        filter: { query: "", location: "", category: "alle", timeWindow: "alle" },
        paginationOpts: { numItems: Math.min(50, Math.max(1, spec.publishedCount)), cursor: null },
      }),
    ),
    await measureEndpoint("catalogEventListPublishedPageQuery:sparseFilter", spec.sparse ? 1 : 0, () =>
      t.query(api.catalog.catalogEventListPublishedPageQuery, {
        filter: {
          query: spec.sparse ? "Benchmark event 0" : "Benchmark event 1999",
          location: "",
          category: "alle",
          timeWindow: "alle",
        },
        paginationOpts: { numItems: 50, cursor: null },
      }),
    ),
    await measureEndpoint("catalogSyncSnapshotQuery:fullCursorTraversal", spec.recordCount, async () => {
      const read = await readCatalogSnapshot(t, spec.recordCount)
      return { events: read.events, pageCount: read.pageCount }
    }),
    await measureEndpoint("catalogSyncPushAction:boundedAtomicRequest", 1, () =>
      t.action(internal.catalog.catalogSyncPushAction, { requestedVersion: spec.recordCount }),
    ),
    await measureEndpoint("ticketOrderListMineQuery", spec.targetOrderCount, () =>
      t.query(api.ticketing.ticketOrderListMineQuery, { token }),
    ),
    await measureEndpoint("ticketOrderListMinePaginatedQuery", Math.min(50, spec.targetOrderCount), () =>
      t.query(api.ticketing.ticketOrderListMinePaginatedQuery, {
        token,
        paginationOpts: { numItems: Math.min(50, spec.targetOrderCount), cursor: null },
      }),
    ),
  ]
  console.log(`Completed ${spec.name} query workload`)
  const invalidation = spec.sparse ? await verifyInvalidation(t, fixture, token) : { verified: false }
  const processPeakDuringFixtureAndWorkloads = measurements.reduce(
    (peak, measurement) => maximumMemory(peak, measurement.workloadProcessPeak),
    fixtureSetupProcessPeak,
  )

  return {
    name: spec.name,
    recordCount: spec.recordCount,
    publishedCount: spec.publishedCount,
    targetOrderCount: spec.targetOrderCount,
    seedTransactionCount: fixture.seedTransactionCount,
    fixtureSetupDurationMs,
    fixtureProcessBaseline,
    fixtureProcessAfterSetup,
    fixtureSetupProcessPeak,
    processPeakDuringFixtureAndWorkloads,
    catalogSync: {
      buildDurationMs: snapshotBuildDurationMs,
      eventCount: snapshot.eventCount,
      chunkCount: snapshot.chunkCount,
      payloadBytes: snapshot.payloadBytes,
      largestBillingRequestBytes,
    },
    measurements,
    invalidation,
  }
}

test("records a local Convex baseline for catalog, sync, and mine-order queries", async () => {
  const startedAt = new Date().toISOString()
  const scenarios: ScenarioResult[] = []
  const allSpecs: FixtureSpec[] = [
    { name: "10-dense", recordCount: 10, publishedCount: 10, targetOrderCount: 10, sparse: false },
    { name: "100-dense", recordCount: 100, publishedCount: 100, targetOrderCount: 100, sparse: false },
    { name: "2000-dense", recordCount: 2_000, publishedCount: 2_000, targetOrderCount: 2_000, sparse: false },
    { name: "2000-sparse", recordCount: 2_000, publishedCount: 1, targetOrderCount: 1, sparse: true },
  ]
  const selectedNames = process.env.BENCHMARK_SCENARIOS?.split(",")
    .map((name) => name.trim())
    .filter(Boolean)
  const specs = selectedNames ? allSpecs.filter((spec) => selectedNames.includes(spec.name)) : allSpecs
  for (const spec of specs) {
    scenarios.push(await runScenario(spec))
  }
  const result = {
    benchmark: "eventoren-catalog-orders-baseline",
    startedAt,
    completedAt: new Date().toISOString(),
    runtime: {
      backend: "local convex-test/mock",
      convexTestVersion: "0.0.56",
      processMemoryIncludes: ["Vitest runner", "convex-test mock storage", "JavaScript heap", "GC variability"],
      hostedFunctionMemoryCaptured: false,
      readMetrics: {
        supported: false,
        reason: "convex-test exposes transaction limits but no per-query read-row or read-byte usage API",
      },
      process: {
        bun: process.versions.bun ?? null,
        node: process.version,
        platform: platform(),
        release: release(),
        arch: arch(),
        hostname: hostname(),
        logicalCpuCount: cpus().length,
        totalSystemMemoryBytes: totalmem(),
      },
      execution: {
        command: "bun run benchmark:catalog-orders",
        selectedScenarios: process.env.BENCHMARK_SCENARIOS ?? "all",
        outputPath,
        repeatCountSource: process.env.BENCHMARK_REPEAT_COUNT ? "BENCHMARK_REPEAT_COUNT" : "default",
        isolatedProcessGuidance:
          "Run one BENCHMARK_SCENARIOS value per command so each artifact has a fresh process and isolated mock store.",
      },
      memorySampling: {
        intervalMs: 1,
        peakType: "sampled process peak; absolute and baseline delta",
        notFunctionMemory: true,
      },
    },
    workload: {
      repeatCount,
      fixtureSetupExcludedFromLatency: true,
      fixtureSetupBatchSize: seedBatchSize,
      warmupExcludedFromLatency: true,
      scenarios,
    },
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8")
  console.log(`Catalog/orders baseline written to ${outputPath}`)
  console.log(JSON.stringify(result, null, 2))
})
