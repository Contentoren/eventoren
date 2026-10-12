/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "e2e-snapshot-export-test-secret"

const pilatesKey = "pilates-christmas-event-2027-final"

type Fixture = ReturnType<typeof convexTest>

async function adminTokenFor(t: Fixture) {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  return { token: await testAuthSessionTokenCreate(t, userId, secret), userId }
}

async function nonAdminTokenFor(t: Fixture) {
  const now = new Date().toISOString()
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "member", role: "organizer", createdAt: now, updatedAt: now }),
  )
  return testAuthSessionTokenCreate(t, userId, secret)
}

function genuinePayload(eventKey: string, chunkIndex: number) {
  return JSON.stringify({
    eventKey,
    title: `Event ${chunkIndex}`,
    subtitle: "",
    description: "",
    category: "test",
    startsAt: "2027-01-10T18:00:00.000Z",
    endsAt: "2027-01-10T22:00:00.000Z",
    doorsAt: "2027-01-10T17:00:00.000Z",
    venue: "Test",
    city: "Berlin",
    address: "Test",
    organizer: "Eventoren",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status: "published",
    catalogVersion: 5,
    eventRevision: 1,
    tiers: [],
  })
}

function pilatesPayload() {
  return JSON.stringify({
    eventKey: pilatesKey,
    title: "Pilates Christmas Event",
    subtitle: "",
    description: "Weihnachts-Pilates mit Flora Bonn",
    category: "test",
    startsAt: "2027-01-10T18:00:00.000Z",
    endsAt: "2027-01-10T22:00:00.000Z",
    doorsAt: "2027-01-10T17:00:00.000Z",
    venue: "Test",
    city: "Berlin",
    address: "Test",
    organizer: "Jennifer Kalus Hair Boutique",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status: "published",
    catalogVersion: 7,
    eventRevision: 1,
    tiers: [],
  })
}

test("admin reads a ready snapshot paged and a building snapshot returns null", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 5,
      status: "ready",
      nextChunkIndex: 30,
      eventCount: 30,
      chunkCount: 30,
      payloadBytes: 100,
      updatedAt: now,
    })
    for (let index = 0; index < 30; index += 1)
      await ctx.db.insert("catalogSyncSnapshotChunks", {
        version: 5,
        chunkIndex: index,
        eventKey: `event-${index.toString().padStart(3, "0")}`,
        payloadJson: genuinePayload(`event-${index.toString().padStart(3, "0")}`, index),
      })
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 6,
      status: "building",
      nextChunkIndex: 0,
      eventCount: 0,
      chunkCount: 0,
      payloadBytes: 10,
      updatedAt: now,
    })
  })

  const first = await t.query(api.catalog.catalogE2eSnapshotExportQuery, { token, requestedVersion: 5 })
  expect(first.success).toBe(true)
  if (!first.success) throw new Error("ready export failed")
  expect(first.data).not.toBeNull()
  expect(first.data?.catalogVersion).toBe(5)
  expect(first.data?.isDone).toBe(false)
  expect(typeof first.data?.continueCursor).toBe("string")

  const events: Record<string, unknown>[] = [...(first.data?.events as Record<string, unknown>[])]
  let cursor: string | undefined = first.data?.continueCursor
  for (let pages = 0; pages < 10; pages += 1) {
    const next = await t.query(api.catalog.catalogE2eSnapshotExportQuery, {
      token,
      requestedVersion: 5,
      cursor: cursor!,
    })
    expect(next.success).toBe(true)
    if (!next.success) throw new Error("paged export failed")
    events.push(...((next.data?.events ?? []) as Record<string, unknown>[]))
    if (next.data?.isDone) break
    cursor = next.data?.continueCursor
  }
  expect(events).toHaveLength(30)

  const building = await t.query(api.catalog.catalogE2eSnapshotExportQuery, { token, requestedVersion: 6 })
  expect(building.success).toBe(true)
  if (!building.success) throw new Error("building export failed")
  expect(building.data).toBeNull()
})

test("invalid and non-admin tokens are refused without exposing the token", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token: adminToken } = await adminTokenFor(t)
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 5,
      status: "ready",
      nextChunkIndex: 1,
      eventCount: 1,
      chunkCount: 1,
      payloadBytes: 10,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncSnapshotChunks", {
      version: 5,
      chunkIndex: 0,
      eventKey: "event-000",
      payloadJson: genuinePayload("event-000", 0),
    })
  })

  const badToken = "invalid-token-7f3a9c2e"
  const invalid = await t.query(api.catalog.catalogE2eSnapshotExportQuery, { token: badToken, requestedVersion: 5 })
  expect(invalid.success).toBe(false)
  if (invalid.success) throw new Error("expected invalid token refusal")
  expect(invalid.errorMessage).not.toContain(badToken)
  expect(invalid.errorMessage).not.toContain(adminToken)

  const memberToken = await nonAdminTokenFor(t)
  const nonAdmin = await t.query(api.catalog.catalogE2eSnapshotExportQuery, { token: memberToken, requestedVersion: 5 })
  expect(nonAdmin.success).toBe(false)
  if (nonAdmin.success) throw new Error("expected non-admin refusal")
  expect(nonAdmin.errorMessage).toMatch(/Admin role required/)
  expect(nonAdmin.errorMessage).not.toContain(memberToken)
})

test("ready export preserves the genuine Pilates payload", async () => {
  const t = convexTest(schema, modules)
  process.env.AUTH_SECRET = secret
  const now = new Date().toISOString()
  const { token } = await adminTokenFor(t)
  await t.run(async (ctx) => {
    await ctx.db.insert("catalogSyncSnapshots", {
      version: 7,
      status: "ready",
      nextChunkIndex: 1,
      eventCount: 1,
      chunkCount: 1,
      payloadBytes: 100,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncSnapshotChunks", {
      version: 7,
      chunkIndex: 0,
      eventKey: pilatesKey,
      payloadJson: pilatesPayload(),
    })
  })

  const exported = await t.query(api.catalog.catalogE2eSnapshotExportQuery, { token, requestedVersion: 7 })
  expect(exported.success).toBe(true)
  if (!exported.success || !exported.data) throw new Error("genuine export failed")
  expect(exported.data.isDone).toBe(true)
  expect(exported.data.events).toHaveLength(1)
  const event = exported.data.events[0] as Record<string, unknown>
  expect(event.eventKey).toBe(pilatesKey)
  expect(event.title).toBe("Pilates Christmas Event")
  expect(event.organizer).toBe("Jennifer Kalus Hair Boutique")
})
