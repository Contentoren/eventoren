/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.js"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.js"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-20T00:00:00.000Z"

type SeedOptions = {
  orgStatus?: "pruefung" | "aktiv" | "gesperrt"
  configured?: boolean
  withOrganizationRow?: boolean
  withEventOrg?: boolean
}

async function organizerSalesSeed(options: SeedOptions = {}) {
  const t = convexTest(schema, modules)
  const seed = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Organizer sales",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 1,
      status: "synced",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    const orgId = await ctx.db.insert("orgs", {
      orgHandle: "sales-org",
      name: "Sales Org",
      createdAt: now,
      updatedAt: now,
    })
    if (options.withOrganizationRow !== false) {
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId,
        status: options.orgStatus ?? "aktiv",
        profile: { name: "Sales Org", slug: "sales-org", kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        configurationConfirmed: options.configured ?? true,
        createdAt: now,
        updatedAt: now,
      })
    }
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey: "organizer-owned",
      title: "Owned",
      subtitle: "",
      description: "",
      category: "konzerte",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Sales Org",
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Stage",
      tags: [],
      status: "published",
      ...(options.withEventOrg !== false ? { orgId } : {}),
      catalogVersion: 1,
      eventRevision: 1,
      createdAt: now,
      updatedAt: now,
    })
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "standard",
      name: "Standard",
      description: "",
      priceCents: 100,
      feeCents: 10,
      capacity: 100,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    return { orgId, eventId, tierId }
  })
  return { t, ...seed }
}

type Seed = Awaited<ReturnType<typeof organizerSalesSeed>>

function prepareArgs(checkoutKey: string, paymentReference: string) {
  return {
    checkoutKey,
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    customerAddress: "Street",
    customerPhone: "",
    eventKey: "organizer-owned",
    catalogVersion: 1,
    eventRevision: 1,
    stripeMode: "test" as const,
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    locale: "de" as const,
    paymentReference,
    fulfillmentEligible: true,
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
    tickets: [{ tierKey: "standard", quantity: 1, participantNames: ["Ada Lovelace"] }],
  }
}

async function inventoryRead(t: Seed["t"], seed: { tierId: Id<"catalogTicketTiers">; eventId: Id<"catalogEvents"> }) {
  return await t.run(async (ctx) => ({
    tier: await ctx.db.get("catalogTicketTiers", seed.tierId),
    orders: await ctx.db
      .query("ticketOrders")
      .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", "organizer-owned"))
      .collect(),
    reservations: await ctx.db
      .query("ticketReservations")
      .withIndex("tierIdAndStatus", (q) => q.eq("tierId", seed.tierId).eq("status", "active"))
      .collect(),
    codes: await ctx.db
      .query("ticketActivationCodes")
      .withIndex("tierIdAndStatusAndNumber", (q) => q.eq("tierId", seed.tierId).eq("status", "reserved"))
      .collect(),
  }))
}

test("a blocked organization denies a new checkout without inventory writes", async () => {
  const { t, ...seed } = await organizerSalesSeed({ orgStatus: "gesperrt" })
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("blocked-new", "blocked-new"),
  )
  expect(result.success).toBe(false)
  const inventory = await inventoryRead(t, seed)
  expect(inventory.tier).toMatchObject({ reserved: 0, sold: 0 })
  expect(inventory.orders).toHaveLength(0)
  expect(inventory.reservations).toHaveLength(0)
})

test("an organization in review denies a new checkout", async () => {
  const { t, ...seed } = await organizerSalesSeed({ orgStatus: "pruefung" })
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("review-new", "review-new"),
  )
  expect(result.success).toBe(false)
  const inventory = await inventoryRead(t, seed)
  expect(inventory.tier).toMatchObject({ reserved: 0, sold: 0 })
  expect(inventory.orders).toHaveLength(0)
})

test("a live organization without confirmed fee and tax configuration denies a new checkout", async () => {
  const { t, ...seed } = await organizerSalesSeed({ orgStatus: "aktiv", configured: false })
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("unconfigured-new", "unconfigured-new"),
  )
  expect(result.success).toBe(false)
  const inventory = await inventoryRead(t, seed)
  expect(inventory.tier).toMatchObject({ reserved: 0, sold: 0 })
  expect(inventory.orders).toHaveLength(0)
})

test("an owned event without an organization row denies a new checkout", async () => {
  const { t, ...seed } = await organizerSalesSeed({ withOrganizationRow: false })
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("missing-org-new", "missing-org-new"),
  )
  expect(result.success).toBe(false)
  const inventory = await inventoryRead(t, seed)
  expect(inventory.tier).toMatchObject({ reserved: 0, sold: 0 })
  expect(inventory.orders).toHaveLength(0)
})

test("an approved organization snapshots the canonical event ownership on the order", async () => {
  const { t, orgId, ...seed } = await organizerSalesSeed({ orgStatus: "aktiv", configured: true })
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("approved-new", "approved-new"),
  )
  expect(result.success).toBe(true)
  if (!result.success) return
  const order = await t.run(async (ctx) => ctx.db.get("ticketOrders", result.data.orderId))
  // Canonical snapshot follows the event, never a client-supplied value
  // (the prepare args carry no orgId at all).
  expect(order?.orgId).toBe(orgId)
  expect(order).toMatchObject({ status: "reserved", paymentStatus: "pending", totalCents: 110 })
  const byOrg = await t.run(async (ctx) =>
    ctx.db
      .query("ticketOrders")
      .withIndex("orgIdAndCreatedAt", (q) => q.eq("orgId", orgId))
      .collect(),
  )
  expect(byOrg.map((row) => row._id)).toContain(order?._id)
  const byOrgAndEvent = await t.run(async (ctx) =>
    ctx.db
      .query("ticketOrders")
      .withIndex("orgIdAndEventKeyAndCreatedAt", (q) => q.eq("orgId", orgId).eq("eventKey", "organizer-owned"))
      .collect(),
  )
  expect(byOrgAndEvent.map((row) => row._id)).toContain(order?._id)
  const inventory = await inventoryRead(t, seed)
  expect(inventory.tier).toMatchObject({ reserved: 1, sold: 0 })
})

test("an unowned legacy event checks out without an ownership snapshot", async () => {
  const { t, ...seed } = await organizerSalesSeed({ withEventOrg: false })
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("legacy-new", "legacy-new"),
  )
  expect(result.success).toBe(true)
  if (!result.success) return
  const order = await t.run(async (ctx) => ctx.db.get("ticketOrders", result.data.orderId))
  expect(order?.orgId).toBeUndefined()
  expect(order).toMatchObject({ status: "reserved", paymentStatus: "pending" })
  const inventory = await inventoryRead(t, seed)
  expect(inventory.tier).toMatchObject({ reserved: 1, sold: 0 })
})

test("blocking between pending attempts denies replay and new checkouts without extra writes", async () => {
  const { t, orgId, ...seed } = await organizerSalesSeed({ orgStatus: "aktiv", configured: true })
  const first = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("pending-replay", "pending-replay"),
  )
  expect(first.success).toBe(true)
  if (!first.success) return
  await t.run(async (ctx) => {
    const organization = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique()
    await ctx.db.patch("organizerDashboardOrganizations", organization!._id, { status: "gesperrt" })
  })
  const replay = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("pending-replay", "pending-replay"),
  )
  expect(replay.success).toBe(false)
  const second = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("pending-second", "pending-second"),
  )
  expect(second.success).toBe(false)
  const inventory = await inventoryRead(t, seed)
  expect(inventory.tier).toMatchObject({ reserved: 1, sold: 0 })
  expect(inventory.orders).toHaveLength(1)
  expect(inventory.reservations).toHaveLength(1)
})

test("paid replay stays idempotent and settleable after the org is blocked", async () => {
  const { t, orgId } = await organizerSalesSeed({ orgStatus: "aktiv", configured: true })
  const first = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("paid-replay", "paid-replay"),
  )
  expect(first.success).toBe(true)
  if (!first.success) return
  const correlation = {
    orderId: first.data.orderId,
    paymentReference: "paid-replay",
    billingOrderReference: "billing-paid-replay",
    stripeMode: "test" as const,
  }
  expect(
    await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
      ...correlation,
      payment: "paid",
      stripePaymentIntentStatus: "succeeded",
    }),
  ).toMatchObject({ success: true, data: { paymentStatus: "paid", ticketCount: 1 } })
  await t.run(async (ctx) => {
    const organization = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique()
    await ctx.db.patch("organizerDashboardOrganizations", organization!._id, { status: "gesperrt" })
  })
  const replay = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("paid-replay", "paid-replay"),
  )
  expect(replay).toMatchObject({ success: true, data: { status: "paid", paymentStatus: "paid", replayed: true } })
  // Settlement stays possible and issues nothing twice; no refund or release
  // is written as a side effect of the block.
  expect(
    await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
      ...correlation,
      payment: "paid",
      stripePaymentIntentStatus: "succeeded",
    }),
  ).toMatchObject({ success: true, data: { status: "paid", paymentStatus: "paid", ticketCount: 1 } })
  const order = await t.run(async (ctx) => ctx.db.get("ticketOrders", first.data.orderId))
  expect(order).toMatchObject({ status: "paid", paymentStatus: "paid", orgId })
  expect(order?.cancellation).toBeUndefined()
  expect(order?.releasedAt).toBeUndefined()
  const work = await t.run(async (ctx) =>
    ctx.db
      .query("ticketFulfillmentWork")
      .withIndex("orderId", (q) => q.eq("orderId", first.data.orderId))
      .collect(),
  )
  expect(work.length).toBeGreaterThan(0)
})
