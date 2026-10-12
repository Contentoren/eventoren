/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "catalog-tier-activation-code-test-secret"
process.env.AUTH_SECRET = authSecret

async function adminTokenCreate(t: ReturnType<typeof convexTest>) {
  const now = new Date().toISOString()
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "admin user",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    }),
  )
  const token = await createToken(userId, authSecret)
  await t.run(async (ctx) =>
    ctx.db.insert("authSessions", {
      userId,
      loginMethod: "dev",
      token,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    }),
  )
  return token
}

function eventArgs(token: string) {
  return {
    eventKey: "catalog-event",
    title: "Katalogveranstaltung",
    subtitle: "Eine veröffentlichte Veranstaltung",
    description: "Eine Katalog-Testveranstaltung",
    category: "konzerte" as const,
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Testveranstaltung",
    tags: ["test"],
    token,
  }
}

function tierArgs(token: string, overrides: Record<string, unknown> = {}) {
  return {
    eventKey: "catalog-event",
    tierKey: "standard",
    name: "Standard",
    description: "Freie Platzwahl",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2500,
    feeCents: 250,
    capacity: 100,
    token,
    ...overrides,
  }
}

async function storedActivationCodeRequiredGet(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => (await ctx.db.query("catalogTicketTiers").first())?.activationCodeRequired)
}

test("omitted activationCodeRequired defaults to false in storage and published tiers", async () => {
  const t = convexTest(schema, modules)
  const token = await adminTokenCreate(t)
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))

  const upserted = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token))
  expect(upserted.success).toBe(true)
  expect(await storedActivationCodeRequiredGet(t)).toBe(false)

  await t.mutation(api.catalog.catalogEventPublishMutation, { eventKey: "catalog-event", token })
  const projected = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  expect(projected?.tiers[0]).toMatchObject({ activationCodeRequired: false })
})

test("enabled activationCodeRequired persists and stays visible in published tiers", async () => {
  const t = convexTest(schema, modules)
  const token = await adminTokenCreate(t)
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))

  const created = await t.mutation(
    api.catalog.catalogTicketTierUpsertMutation,
    tierArgs(token, { activationCodeRequired: true }),
  )
  expect(created.success).toBe(true)
  expect(await storedActivationCodeRequiredGet(t)).toBe(true)

  await t.mutation(api.catalog.catalogEventPublishMutation, { eventKey: "catalog-event", token })
  const projected = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  expect(projected?.tiers[0]).toMatchObject({ activationCodeRequired: true })
})

test("omitted activationCodeRequired preserves the stored value and unchanged resaves keep versions", async () => {
  const t = convexTest(schema, modules)
  const token = await adminTokenCreate(t)
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))

  const created = await t.mutation(
    api.catalog.catalogTicketTierUpsertMutation,
    tierArgs(token, { activationCodeRequired: true }),
  )
  expect(created.success).toBe(true)
  if (!created.success) return

  const unchanged = await t.mutation(
    api.catalog.catalogTicketTierUpsertMutation,
    tierArgs(token, { activationCodeRequired: true }),
  )
  expect(unchanged).toMatchObject({
    success: true,
    data: { catalogVersion: created.data.catalogVersion, eventRevision: created.data.eventRevision },
  })

  const omitted = await t.mutation(
    api.catalog.catalogTicketTierUpsertMutation,
    tierArgs(token, { description: "Updated description" }),
  )
  expect(omitted.success).toBe(true)
  expect(await storedActivationCodeRequiredGet(t)).toBe(true)

  const disabled = await t.mutation(
    api.catalog.catalogTicketTierUpsertMutation,
    tierArgs(token, { description: "Updated description", activationCodeRequired: false }),
  )
  expect(disabled.success).toBe(true)
  if (!disabled.success) return
  expect(disabled.data.eventRevision).toBeGreaterThan(created.data.eventRevision)
  expect(await storedActivationCodeRequiredGet(t)).toBe(false)
})

test("legacy tiers without a stored flag project as not required", async () => {
  const t = convexTest(schema, modules)
  const token = await adminTokenCreate(t)
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token))

  await t.run(async (ctx) => {
    const tier = await ctx.db.query("catalogTicketTiers").first()
    if (!tier) throw new Error("tier missing")
    await ctx.db.patch("catalogTicketTiers", tier._id, { activationCodeRequired: undefined })
  })

  await t.mutation(api.catalog.catalogEventPublishMutation, { eventKey: "catalog-event", token })
  const projected = await t.query(api.catalog.catalogEventGetPublishedQuery, { eventKey: "catalog-event" })
  expect(projected?.tiers[0]).toMatchObject({ activationCodeRequired: false })
})
