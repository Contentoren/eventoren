/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "catalog-convex-test-secret"
process.env.AUTH_SECRET = authSecret

afterEach(() => {
  vi.useRealTimers()
})

async function createUser(t: ReturnType<typeof convexTest>, role: "user" | "admin" | "dev") {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: `${role} user`,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function tokenFor(userId: string) {
  return await createToken(userId, authSecret)
}

function eventArgs(token: string, status?: "draft" | "published" | "archived") {
  return {
    eventKey: "catalog-event",
    title: "Catalog event",
    subtitle: "A published event",
    description: "A catalog test event",
    category: "konzerte" as const,
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Test event",
    tags: ["test"],
    ...(status ? { status } : {}),
    token,
  }
}

test("rejects catalog writes without an admin role", async () => {
  const t = convexTest(schema, modules)
  const userId = await createUser(t, "user")
  const token = await tokenFor(userId)

  const missingToken = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(""))
  const regularUser = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))

  expect(missingToken.success).toBe(false)
  expect(regularUser.success).toBe(false)
})

test("admin writes are versioned and published reads match EventItem", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const token = await tokenFor(adminId)

  const event = await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))
  expect(event.success).toBe(true)
  if (!event.success) return

  const tier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "General admission",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  })
  expect(tier.success).toBe(true)
  if (!tier.success) return

  const published = await t.mutation(api.catalog.catalogEventPublishMutation, {
    eventKey: "catalog-event",
    token,
  })
  expect(published.success).toBe(true)
  if (!published.success) return

  const items = await t.query(api.catalog.catalogEventListPublishedQuery, {})
  const item = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  expect(items).toHaveLength(1)
  expect(item).toMatchObject({
    id: "catalog-event",
    title: "Catalog event",
    soldOut: false,
    tiers: [{ id: "standard", priceCents: 2500, feeCents: 250, capacity: 10, available: 10 }],
  })
  expect(published.data.catalogVersion).toBeGreaterThan(event.data.catalogVersion)

  const syncState = await t.run(async (ctx) => ctx.db.query("catalogSyncStates").collect())
  expect(syncState).toMatchObject([{ version: published.data.catalogVersion, status: "pending", attempts: 0 }])
})

test("tier capacity cannot undercut reserved and sold inventory", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "dev")
  const token = await tokenFor(adminId)

  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token, "draft"))
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "General admission",
    priceCents: 2500,
    feeCents: 250,
    capacity: 10,
    token,
  })

  const tierIds = await t.run(async (ctx) => {
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "catalog-event"))
      .unique()
    if (!event) return null
    const tier = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", "standard"))
      .unique()
    if (!tier) return null
    return tier._id
  })
  expect(tierIds).not.toBeNull()
  if (!tierIds) return
  await t.run(async (ctx) => ctx.db.patch("catalogTicketTiers", tierIds, { reserved: 2, sold: 1 }))

  const rejected = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "General admission",
    priceCents: 2500,
    feeCents: 250,
    capacity: 2,
    token,
  })
  const accepted = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "General admission",
    priceCents: 2500,
    feeCents: 250,
    capacity: 4,
    token,
  })

  expect(rejected.success).toBe(false)
  expect(accepted.success).toBe(true)
})
