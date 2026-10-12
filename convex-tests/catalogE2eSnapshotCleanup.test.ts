/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "e2e-snapshot-cleanup-test-secret"

const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const fixtureKey = `ticket-e2e-${runId}`
const fixtureTitle = `Ticket E2E ${runId}`
const fixtureOrganizer = `Eventoren Ticket E2E ${runId}`
const technicalKey = "technischer-checkout-test-keine-veranstaltung-e879ab05"
const nearForeignKey = "technischer-checkout-test-keine-veranstaltung-e879ab06"
const readinessKey = "readiness-technical-draft-20260914"
const pilatesKey = "pilates-christmas-event-2027-final"
const foreignKey = "some-test-event"

type Fixture = ReturnType<typeof convexTest>

async function adminTokenFor(t: Fixture) {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  return { token: await testAuthSessionTokenCreate(t, userId, secret), userId }
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

function snapshotPayload(eventKey: string, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    eventKey,
    title: overrides.title ?? `Title ${eventKey}`,
    subtitle: "",
    description: overrides.description ?? "",
    category: "test",
    startsAt: "2027-01-10T18:00:00.000Z",
    endsAt: "2027-01-10T22:00:00.000Z",
    doorsAt: "2027-01-10T17:00:00.000Z",
    venue: "Test",
    city: "Berlin",
    address: "Test",
    organizer: overrides.organizer ?? "Eventoren",
    imageUrl: overrides.imageUrl ?? "",
    imageAlt: "",
    tags: [],
    status: "published",
    catalogVersion: 77,
    eventRevision: 1,
    tiers: [],
  })
}

function fixturePayload() {
  return snapshotPayload(fixtureKey, { title: fixtureTitle, organizer: fixtureOrganizer })
}

function technicalPayload() {
  return snapshotPayload(technicalKey, {
    title: "Technischer Checkout-Test – keine Veranstaltung",
    organizer: "Eventoren",
    description: "Fiktiver technischer Checkout-Test, keine Veranstaltung, keine echten Tickets",
  })
}

function pilatesPayload() {
  return snapshotPayload(pilatesKey, {
    title: "Pilates Christmas Event",
    organizer: "Jennifer Kalus Hair Boutique",
    description: "Weihnachts-Pilates mit Flora Bonn",
  })
}

function genuineFillerPayload(index: number) {
  return snapshotPayload(`event-${index.toString().padStart(3, "0")}`, {
    title: `Event ${index}`,
    organizer: "Eventoren",
  })
}

async function drainSnapshotCleanup(t: Fixture, token: string) {
  let cursor: string | undefined
  let cleaned = 0
  let deletedChunks = 0
  for (let pages = 0; pages < 100; pages += 1) {
    const result = await t.mutation(api.catalog.catalogE2eSnapshotHistoricalCleanupMutation, {
      token,
      ...(cursor ? { cursor } : {}),
    })
    expect(result.success).toBe(true)
    if (!result.success) throw new Error("snapshot cleanup failed")
    cleaned += result.data.cleanedVersions.length
    deletedChunks += result.data.deletedChunks
    if (result.data.isDone) return { cleaned, deletedChunks }
    cursor = result.data.continueCursor ?? undefined
    expect(cursor).toBeTruthy()
  }
  throw new Error("snapshot cleanup did not finish")
}

async function drainSnapshotDiscovery(t: Fixture, token: string) {
  let cursor: string | undefined
  const versions = new Set<number>()
  for (let pages = 0; pages < 100; pages += 1) {
    const result = await t.query(api.catalog.catalogE2eSnapshotHistoricalDiscoveryQuery, {
      token,
      ...(cursor ? { cursor } : {}),
    })
    expect(result.success).toBe(true)
    if (!result.success) throw new Error("snapshot discovery failed")
    for (const candidate of result.data.candidates as { version: number }[]) versions.add(candidate.version)
    if (result.data.isDone) return [...versions].sort((a, b) => a - b)
    cursor = result.data.continueCursor ?? undefined
  }
  throw new Error("snapshot discovery did not finish")
}

async function buildUntilReady(t: Fixture, version: number) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const result = await t.mutation(internal.catalog.catalogSyncSnapshotBuildMutation, { requestedVersion: version })
    expect(result.success).toBe(true)
    if (result.success && result.data.status === "ready") return result.data
  }
  throw new Error("snapshot did not become ready")
}

test("mixed fixture plus Pilates snapshot history deletes obsolete test-bearing versions and rebuilds active coherently", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token, userId } = await adminTokenFor(t)
  const pilatesId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: pilatesKey,
        title: "Pilates Christmas Event",
        organizer: "Jennifer Kalus Hair Boutique",
        description: "Weihnachts-Pilates mit Flora Bonn",
        status: "published",
      }),
    ),
  )
  const pilatesTierId = await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId: pilatesId,
      tierKey: "standard",
      name: "Standard",
      description: "General admission",
      priceCents: 2500,
      feeCents: 250,
      capacity: 100,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const fixtureId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: fixtureKey,
        title: fixtureTitle,
        organizer: fixtureOrganizer,
        status: "published",
      }),
    ),
  )
  await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId: fixtureId,
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
  const foreignId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, { eventKey: foreignKey, title: "Test", organizer: "Real organizer", status: "published" }),
    ),
  )
  const nearForeignId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: nearForeignKey,
        title: "Technischer Checkout-Test – keine Veranstaltung",
        description: "Fiktiver technischer Checkout-Test, keine Veranstaltung",
        status: "published",
      }),
    ),
  )
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 77,
      status: "pending",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    for (let version = 1; version <= 77; version += 1) {
      await ctx.db.insert("catalogSyncSnapshots", {
        version,
        status: "ready",
        nextChunkIndex: version === 1 ? 120 : 2,
        eventCount: version === 1 ? 120 : 2,
        chunkCount: version === 1 ? 120 : 2,
        payloadBytes: 100,
        updatedAt: now,
      })
    }
    for (let version = 1; version <= 60; version += 1) {
      if (version === 1) {
        await ctx.db.insert("catalogSyncSnapshotChunks", {
          version,
          chunkIndex: 0,
          eventKey: fixtureKey,
          payloadJson: fixturePayload(),
        })
        await ctx.db.insert("catalogSyncSnapshotChunks", {
          version,
          chunkIndex: 1,
          eventKey: pilatesKey,
          payloadJson: pilatesPayload(),
        })
        for (let index = 2; index < 120; index += 1)
          await ctx.db.insert("catalogSyncSnapshotChunks", {
            version,
            chunkIndex: index,
            eventKey: `event-${(index % 50).toString().padStart(3, "0")}`,
            payloadJson: genuineFillerPayload(index),
          })
        continue
      }
      await ctx.db.insert("catalogSyncSnapshotChunks", {
        version,
        chunkIndex: 0,
        eventKey: fixtureKey,
        payloadJson: fixturePayload(),
      })
      await ctx.db.insert("catalogSyncSnapshotChunks", {
        version,
        chunkIndex: 1,
        eventKey: pilatesKey,
        payloadJson: pilatesPayload(),
      })
    }
    for (let version = 61; version <= 76; version += 1) {
      await ctx.db.insert("catalogSyncSnapshotChunks", {
        version,
        chunkIndex: 0,
        eventKey: pilatesKey,
        payloadJson: pilatesPayload(),
      })
      await ctx.db.insert("catalogSyncSnapshotChunks", {
        version,
        chunkIndex: 1,
        eventKey: foreignKey,
        payloadJson: snapshotPayload(foreignKey, { title: "Test", organizer: "Real organizer" }),
      })
    }
    await ctx.db.insert("catalogSyncSnapshotChunks", {
      version: 77,
      chunkIndex: 0,
      eventKey: fixtureKey,
      payloadJson: fixturePayload(),
    })
    await ctx.db.insert("catalogSyncSnapshotChunks", {
      version: 77,
      chunkIndex: 1,
      eventKey: pilatesKey,
      payloadJson: pilatesPayload(),
    })
  })

  const preDiscovery = await drainSnapshotDiscovery(t, token)
  expect(preDiscovery).toContain(1)
  expect(preDiscovery).toContain(60)
  expect(preDiscovery).toContain(77)
  expect(preDiscovery).not.toContain(61)
  expect(preDiscovery).not.toContain(76)

  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned.map((entry: { eventKey: string }) => entry.eventKey)).toContain(fixtureKey)
  expect(swept.data.scannedSnapshots).toBe(0)
  expect(swept.data.cleanedSnapshotVersions).toEqual([])
  expect(swept.data.deletedSnapshotChunks).toBe(0)
  expect(swept.data.snapshotCleanup).toBe("deferred-to-paged-snapshot-collector")

  expect(await t.run((ctx) => ctx.db.get("catalogEvents", fixtureId))).toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", pilatesId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", pilatesTierId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", foreignId))).not.toBeNull()
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", nearForeignId))).not.toBeNull()

  const stillBearing = await drainSnapshotDiscovery(t, token)
  expect(stillBearing).toContain(1)
  expect(stillBearing).toContain(60)
  expect(stillBearing).toContain(77)

  const paged = await drainSnapshotCleanup(t, token)
  expect(paged.cleaned).toBeGreaterThan(0)

  const remaining = await t.run(async (ctx) => ({
    snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
    chunks: await ctx.db.query("catalogSyncSnapshotChunks").collect(),
  }))
  expect(
    remaining.snapshots
      .map((row) => row.version)
      .sort((a, b) => a - b)
      .slice(0, 5),
  ).not.toContain(1)
  expect(remaining.snapshots.some((row) => row.version === 1)).toBe(false)
  expect(remaining.snapshots.some((row) => row.version === 60)).toBe(false)
  expect(remaining.snapshots.some((row) => row.version === 61)).toBe(true)
  expect(remaining.chunks.some((row) => row.eventKey === fixtureKey)).toBe(false)
  expect(remaining.chunks.some((row) => row.version === 1)).toBe(false)
  expect(remaining.chunks.filter((row) => row.version >= 61 && row.version <= 76).length).toBeGreaterThan(0)

  const active = await t.run(async (ctx) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    const snapshot = state
      ? await ctx.db
          .query("catalogSyncSnapshots")
          .withIndex("version", (q) => q.eq("version", state.version))
          .unique()
      : null
    return { version: state?.version, snapshot }
  })
  expect(active.version).toBeGreaterThan(77)
  const rebuilt = await buildUntilReady(t, active.version!)
  expect(rebuilt.status).toBe("ready")
  const events: Record<string, unknown>[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await t.query(internal.catalog.catalogSyncSnapshotQuery, {
      requestedVersion: active.version!,
      ...(cursor ? { cursor } : {}),
    })
    expect(page).not.toBeNull()
    if (!page) break
    events.push(...page.events)
    if (page.isDone) break
    cursor = page.continueCursor
  }
  const keys = events.map((event) => event.eventKey as string)
  expect(keys).toContain(pilatesKey)
  expect(keys).toContain(foreignKey)
  expect(keys).toContain(nearForeignKey)
  expect(keys).not.toContain(fixtureKey)
  expect(keys).not.toContain(technicalKey)
  expect(keys).not.toContain(readinessKey)

  const postDiscovery = await drainSnapshotDiscovery(t, token)
  expect(postDiscovery).toEqual([])
  const resweep = await drainSnapshotCleanup(t, token)
  expect(resweep.cleaned).toBe(0)
})

test("technical-checkout snapshot payload is recognized while near-foreign and generic rows are retained", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token, userId } = await adminTokenFor(t)
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 77,
      status: "pending",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 76,
      status: "ready",
      nextChunkIndex: 1,
      eventCount: 1,
      chunkCount: 1,
      payloadBytes: 100,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncSnapshotChunks", {
      version: 76,
      chunkIndex: 0,
      eventKey: technicalKey,
      payloadJson: technicalPayload(),
    })
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 77,
      status: "ready",
      nextChunkIndex: 2,
      eventCount: 2,
      chunkCount: 2,
      payloadBytes: 100,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncSnapshotChunks", {
      version: 77,
      chunkIndex: 0,
      eventKey: nearForeignKey,
      payloadJson: snapshotPayload(nearForeignKey, { description: "Fiktiver technischer Checkout-Test" }),
    })
    await ctx.db.insert("catalogSyncSnapshotChunks", {
      version: 77,
      chunkIndex: 1,
      eventKey: foreignKey,
      payloadJson: snapshotPayload(foreignKey, { title: "Test", organizer: "Real organizer" }),
    })
  })
  const discovered = await drainSnapshotDiscovery(t, token)
  expect(discovered).toEqual([76])
  const cleaned = await drainSnapshotCleanup(t, token)
  expect(cleaned.cleaned).toBe(1)
  expect(cleaned.deletedChunks).toBe(1)
  const remaining = await t.run(async (ctx) => ({
    snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
    chunks: await ctx.db.query("catalogSyncSnapshotChunks").collect(),
  }))
  expect(remaining.snapshots.map((row) => row.version)).toEqual([77])
  expect(remaining.chunks.map((row) => row.eventKey).sort()).toEqual([foreignKey, nearForeignKey].sort())
})

test("snapshot cleanup is paged, idempotent and retains genuine-only versions", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token, userId } = await adminTokenFor(t)
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 100,
      status: "pending",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    for (let version = 1; version <= 45; version += 1) {
      await ctx.db.insert("catalogSyncSnapshots", {
        version,
        status: "ready",
        nextChunkIndex: 1,
        eventCount: 1,
        chunkCount: 1,
        payloadBytes: 10,
        updatedAt: now,
      })
      const payload = version % 2 === 0 ? fixturePayload() : pilatesPayload()
      const eventKey = version % 2 === 0 ? fixtureKey : pilatesKey
      await ctx.db.insert("catalogSyncSnapshotChunks", { version, chunkIndex: 0, eventKey, payloadJson: payload })
    }
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 100,
      status: "ready",
      nextChunkIndex: 0,
      eventCount: 0,
      chunkCount: 0,
      payloadBytes: 10,
      updatedAt: now,
    })
  })
  const first = await t.mutation(api.catalog.catalogE2eSnapshotHistoricalCleanupMutation, { token })
  expect(first.success).toBe(true)
  if (!first.success) return
  expect(first.data.isDone).toBe(false)
  expect(first.data.cleanedVersions.length).toBeGreaterThan(0)
  let cursor = first.data.continueCursor ?? undefined
  let total = first.data.cleanedVersions.length
  for (let pages = 0; pages < 10; pages += 1) {
    const next = await t.mutation(api.catalog.catalogE2eSnapshotHistoricalCleanupMutation, {
      token,
      ...(cursor ? { cursor } : {}),
    })
    expect(next.success).toBe(true)
    if (!next.success) return
    total += next.data.cleanedVersions.length
    if (next.data.isDone) break
    cursor = next.data.continueCursor ?? undefined
  }
  expect(total).toBe(22)
  const remaining = await t.run(async (ctx) => ({
    snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
    chunks: await ctx.db.query("catalogSyncSnapshotChunks").collect(),
  }))
  expect(remaining.snapshots.some((row) => row.version % 2 === 0 && row.version !== 100)).toBe(false)
  expect(remaining.snapshots.filter((row) => row.version % 2 === 1).length).toBe(23)
  expect(remaining.chunks.some((row) => row.eventKey === fixtureKey)).toBe(false)
  expect(remaining.chunks.some((row) => row.eventKey === pilatesKey)).toBe(true)
  const retry = await t.mutation(api.catalog.catalogE2eSnapshotHistoricalCleanupMutation, { token })
  expect(retry).toMatchObject({ success: true, data: { cleanedVersions: [], isDone: false } })
})

test("event-page cleanup with 1100 genuine versions defers snapshots to the paged collector", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token, userId } = await adminTokenFor(t)
  const fixtureId = await t.run((ctx) =>
    ctx.db.insert(
      "catalogEvents",
      baseEvent(now, {
        eventKey: fixtureKey,
        title: fixtureTitle,
        organizer: fixtureOrganizer,
        status: "published",
      }),
    ),
  )
  await t.run((ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId: fixtureId,
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
  const genuineVersions = 1100
  const fixtureVersion = 42
  const activeVersion = genuineVersions + 1
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: activeVersion,
      status: "pending",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    for (let version = 1; version <= activeVersion; version += 1) {
      await ctx.db.insert("catalogSyncSnapshots", {
        version,
        status: "ready",
        nextChunkIndex: 1,
        eventCount: 1,
        chunkCount: 1,
        payloadBytes: 10,
        updatedAt: now,
      })
      const isFixture = version === fixtureVersion
      await ctx.db.insert("catalogSyncSnapshotChunks", {
        version,
        chunkIndex: 0,
        eventKey: isFixture ? fixtureKey : pilatesKey,
        payloadJson: isFixture ? fixturePayload() : pilatesPayload(),
      })
    }
  })
  const swept = await t.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, { token, staleAfterMs: 0 })
  expect(swept.success).toBe(true)
  if (!swept.success) return
  expect(swept.data.cleaned.map((entry: { eventKey: string }) => entry.eventKey)).toContain(fixtureKey)
  expect(swept.data.isDone).toBe(true)
  expect(swept.data.scannedSnapshots).toBe(0)
  expect(swept.data.cleanedSnapshotVersions).toEqual([])
  expect(swept.data.snapshotCleanup).toBe("deferred-to-paged-snapshot-collector")
  expect(await t.run((ctx) => ctx.db.get("catalogEvents", fixtureId))).toBeNull()
  const snapshotCount = await t.run(async (ctx) => (await ctx.db.query("catalogSyncSnapshots").collect()).length)
  expect(snapshotCount).toBeGreaterThan(1000)
  let cursor: string | undefined
  let cleaned = 0
  let deletedChunks = 0
  for (let pages = 0; pages < 100; pages += 1) {
    const result = await t.mutation(api.catalog.catalogE2eSnapshotHistoricalCleanupMutation, {
      token,
      ...(cursor ? { cursor } : {}),
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    cleaned += result.data.cleanedVersions.length
    deletedChunks += result.data.deletedChunks
    if (result.data.isDone) break
    cursor = result.data.continueCursor ?? undefined
    expect(cursor).toBeTruthy()
    if (pages === 99) throw new Error("paged snapshot cleanup did not finish")
  }
  expect(cleaned).toBe(1)
  expect(deletedChunks).toBe(1)
  const remaining = await t.run(async (ctx) => ({
    snapshots: await ctx.db.query("catalogSyncSnapshots").collect(),
    chunks: await ctx.db.query("catalogSyncSnapshotChunks").collect(),
  }))
  expect(remaining.snapshots.length).toBe(activeVersion)
  expect(remaining.snapshots.some((row) => row.version === activeVersion + 1)).toBe(true)
  expect(remaining.snapshots.some((row) => row.version === fixtureVersion)).toBe(false)
  expect(remaining.chunks.some((row) => row.eventKey === fixtureKey)).toBe(false)
  expect(remaining.chunks.some((row) => row.eventKey === pilatesKey)).toBe(true)
  const postDiscovery = await drainSnapshotDiscovery(t, token)
  expect(postDiscovery).toEqual([])
})
