/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "ticket-product-order-limit-test-secret"
process.env.AUTH_SECRET = authSecret

async function adminTokenCreate(t: ReturnType<typeof convexTest>) {
  const now = new Date().toISOString()
  const userId = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "admin", role: "admin", createdAt: now, updatedAt: now }),
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
    eventKey: "limit-event",
    title: "Limit event",
    subtitle: "Per-product order limits",
    description: "A ticketing limit test event",
    category: "konzerte" as const,
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Hall",
    city: "Berlin",
    address: "Street 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Test event",
    tags: [],
    token,
  }
}

function tierArgs(token: string, tierKey: string, overrides: Record<string, unknown> = {}) {
  return {
    eventKey: "limit-event",
    tierKey,
    name: tierKey,
    description: "Test tier",
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

function prepareArgs(
  catalogVersion: number,
  eventRevision: number,
  checkoutKey: string,
  tickets: { tierKey: string; quantity: number }[],
) {
  return {
    checkoutKey,
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    customerAddress: "Street 1",
    customerPhone: "",
    eventKey: "limit-event",
    catalogVersion,
    eventRevision,
    tickets: tickets.map((ticket) => ({
      tierKey: ticket.tierKey,
      quantity: ticket.quantity,
      participantNames: Array.from({ length: ticket.quantity }, (_, index) => `Participant ${ticket.tierKey}-${index}`),
    })),
    stripeMode: "test" as const,
    successUrl: "https://eventoren.test/checkout/success",
    cancelUrl: "https://eventoren.test/checkout/cancel",
    locale: "de" as const,
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    paymentReference: `payment_${checkoutKey}`,
    fulfillmentEligible: false,
  }
}

async function seedLimitCatalog(largeOverrides: { maxPerOrder?: number; capacity?: number } = {}) {
  const t = convexTest(schema, modules)
  const token = await adminTokenCreate(t)
  await t.mutation(api.catalog.catalogEventUpsertMutation, eventArgs(token))
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token, "limited", { maxPerOrder: 2 }))
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, tierArgs(token, "legacy"))
  const large = await t.mutation(
    api.catalog.catalogTicketTierUpsertMutation,
    tierArgs(token, "large", { maxPerOrder: 25, ...largeOverrides }),
  )
  if (!large.success) throw new Error("tier seed failed")
  const published = await t.mutation(api.catalog.catalogEventPublishMutation, { eventKey: "limit-event", token })
  if (!published.success) throw new Error("publish failed")
  return { t, catalogVersion: published.data.catalogVersion, eventRevision: published.data.eventRevision }
}

test("a configured maxPerOrder above 1000 is usable without an unrelated selection cap", async () => {
  const { t, catalogVersion, eventRevision } = await seedLimitCatalog({ maxPerOrder: 1001, capacity: 2000 })
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000040", [
      { tierKey: "large", quantity: 1001 },
    ]),
  )
  expect(result.success).toBe(true)
})

test("a configured maxPerOrder of 2 rejects 3 tickets for that product", async () => {
  const { t, catalogVersion, eventRevision } = await seedLimitCatalog()
  const rejected = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000001", [
      { tierKey: "limited", quantity: 3 },
    ]),
  )
  expect(rejected).toMatchObject({
    success: false,
    errorMessage: "The ticket quantity exceeds the maximum per order of 2",
  })
  const allowed = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000002", [
      { tierKey: "limited", quantity: 2 },
    ]),
  )
  expect(allowed.success).toBe(true)
})

test("legacy products without a stored limit default to 10 per order", async () => {
  const { t, catalogVersion, eventRevision } = await seedLimitCatalog()
  await t.run(async (ctx) => {
    const tier = await ctx.db
      .query("catalogTicketTiers")
      .filter((q) => q.eq(q.field("tierKey"), "legacy"))
      .unique()
    if (!tier) throw new Error("legacy tier missing")
    await ctx.db.patch("catalogTicketTiers", tier._id, { maxPerOrder: undefined })
  })
  const allowed = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000003", [
      { tierKey: "legacy", quantity: 10 },
    ]),
  )
  expect(allowed.success).toBe(true)
  const rejected = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000004", [
      { tierKey: "legacy", quantity: 11 },
    ]),
  )
  expect(rejected).toMatchObject({
    success: false,
    errorMessage: "The ticket quantity exceeds the maximum per order of 10",
  })
})

test("a configured maxPerOrder of 25 allows quantities above ten", async () => {
  const { t, catalogVersion, eventRevision } = await seedLimitCatalog()
  for (const [index, quantity] of [11, 25].entries()) {
    const result = await t.mutation(
      internal.ticketing.ticketCheckoutPrepareMutation,
      prepareArgs(catalogVersion, eventRevision, `limitcheckoutkey00000000000000010${index}`, [
        { tierKey: "large", quantity },
      ]),
    )
    expect(result.success).toBe(true)
  }
  const rejected = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000012", [
      { tierKey: "large", quantity: 26 },
    ]),
  )
  expect(rejected).toMatchObject({
    success: false,
    errorMessage: "The ticket quantity exceeds the maximum per order of 25",
  })
})

test("mixed products with a combined total above ten stay permitted within individual limits", async () => {
  const { t, catalogVersion, eventRevision } = await seedLimitCatalog()
  const mixed = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000020", [
      { tierKey: "limited", quantity: 2 },
      { tierKey: "large", quantity: 15 },
    ]),
  )
  expect(mixed.success).toBe(true)
})

test("summed duplicate selections cannot bypass the per-product limit", async () => {
  const { t, catalogVersion, eventRevision } = await seedLimitCatalog()
  const bypass = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000030", [
      { tierKey: "limited", quantity: 2 },
      { tierKey: "limited", quantity: 1 },
    ]),
  )
  expect(bypass).toMatchObject({
    success: false,
    errorMessage: "The ticket quantity exceeds the maximum per order of 2",
  })
})

test("checkout quantities must remain positive safe integers after removing the selection cap", async () => {
  const { t, catalogVersion, eventRevision } = await seedLimitCatalog()
  for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = await t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...prepareArgs(catalogVersion, eventRevision, "limitcheckoutkey000000000000000050", []),
      tickets: [{ tierKey: "large", quantity, participantNames: [] }],
    })
    expect(result).toMatchObject({ success: false, errorMessage: "Ticket quantity is invalid" })
  }
  expect(await t.run(async (ctx) => ctx.db.query("ticketOrders").collect())).toEqual([])
})
