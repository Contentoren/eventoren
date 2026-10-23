import { organizerContractDocuments } from "#src/organizer/dashboard/contracts/organizerContractDocuments.ts"
import { organizerContractPartyConsentFixture } from "../test/organizerContractPartyConsent.fixture.ts"
/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.js"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-20T00:00:00.000Z"
const validIban = "DE89370400440532013000"

test.each(["kaeufer", "veranstalter"] as const)(
  "checkout freezes %s fees per ticket, including quantities and free tickets",
  async (payer) => {
    const t = convexTest(schema, modules)
    await pricingAdmin(t)
    const { orgId } = await pricingOrgInsert(t, `snapshot-${payer}`, {
      fee: { percentBps: 390, fixedCents: 49, payer },
    })
    const { eventId } = await pricingEventInsert(t, orgId, `snapshot-${payer}`)
    // 1001 * 3.9% rounds to 39 cents, plus 49 cents, per ticket (not per order).
    await pricingTierInsert(t, eventId, "standard", 1001, payer === "kaeufer" ? 88 : 0)
    await pricingTierInsert(t, eventId, "free", 0, 0)
    const args = {
      ...prepareArgs(`snapshot-${payer}`, 1, `snapshot-order-${payer}`),
      tickets: [
        { tierKey: "standard", quantity: 3, participantNames: ["One", "Two", "Three"] },
        { tierKey: "free", quantity: 1, participantNames: ["Free"] },
      ],
    }
    const result = await t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, args)
    expect(result.success).toBe(true)
    if (!result.success) return
    const before = await t.run((ctx) => ctx.db.get("ticketOrders", result.data.orderId))
    expect(before).toMatchObject({
      subtotalCents: 3003,
      feeCents: payer === "kaeufer" ? 264 : 0,
      totalCents: payer === "kaeufer" ? 3267 : 3003,
      feeSnapshot: {
        payer: payer === "kaeufer" ? "buyer" : "organizer",
        platformFeeCents: 264,
        organizerDeductionCents: payer === "kaeufer" ? 0 : 264,
      },
    })
    await t.run(async (ctx) => {
      const org = await ctx.db
        .query("organizerDashboardOrganizations")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .unique()
      await ctx.db.patch("organizerDashboardOrganizations", org!._id, {
        fee: { percentBps: 0, fixedCents: 999, payer: "veranstalter" },
      })
    })
    expect((await t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, args)).success).toBe(true)
    expect(await t.run((ctx) => ctx.db.get("ticketOrders", result.data.orderId))).toEqual(before)
  },
)

test("checkout rejects an existing organizer-paid tier below its platform fee before reserving inventory", async () => {
  const t = convexTest(schema, modules)
  await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "too-small", {
    fee: { percentBps: 390, fixedCents: 49, payer: "veranstalter" },
  })
  const { eventId } = await pricingEventInsert(t, orgId, "too-small")
  const { tierId } = await pricingTierInsert(t, eventId, "standard", 1, 0)
  const result = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("too-small", 1, "too-small"),
  )
  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.errorMessage).toContain("übersteigt den Ticketpreis")
  expect(await t.run((ctx) => ctx.db.get("catalogTicketTiers", tierId))).toMatchObject({ reserved: 0 })
})

type Fee = { percentBps: number; fixedCents: number; payer: "kaeufer" | "veranstalter" }

async function pricingAdmin(t: ReturnType<typeof convexTest>): Promise<{ token: string }> {
  const adminId = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "pricing admin", role: "admin", createdAt: now, updatedAt: now }),
  )
  await t.run(async (ctx) =>
    ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 1,
      status: "synced",
      attempts: 0,
      lastChangedByUserId: adminId,
      updatedAt: now,
    }),
  )
  const token = await testAuthSessionTokenCreate(t, adminId, authSecret)
  return { token }
}

async function pricingOrgInsert(
  t: ReturnType<typeof convexTest>,
  slug: string,
  options?: { status?: "pruefung" | "aktiv"; fee?: Fee },
): Promise<{ orgId: Id<"orgs"> }> {
  const orgId = await t.run(async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first()
    if (!admin) throw new Error("Pricing fixture requires its accepting admin")
    const id = await ctx.db.insert("orgs", {
      orgHandle: slug,
      name: `Org ${slug}`,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId: id,
      status: options?.status ?? "aktiv",
      profile: { name: `Org ${slug}`, slug, kind: "verein" },
      bank: { iban: validIban, holder: "Holder" },
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: options?.fee ?? { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      contracts: {
        termsAcceptedAt: now,
        dpaAcceptedAt: now,
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
        consentedByUserId: admin._id,
        termsConsentedAt: now,
        dpaConsentedAt: now,
      },
      configurationConfirmed: true,
      createdAt: now,
      updatedAt: now,
    })
    return id
  })
  return { orgId }
}

async function pricingEventInsert(
  t: ReturnType<typeof convexTest>,
  orgId: Id<"orgs">,
  eventKey: string,
): Promise<{ eventId: Id<"catalogEvents"> }> {
  const eventId = await t.run(async (ctx) =>
    ctx.db.insert("catalogEvents", {
      eventKey,
      title: eventKey,
      subtitle: "",
      description: "",
      category: "konzerte",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: eventKey,
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Stage",
      tags: [],
      status: "published",
      orgId,
      catalogVersion: 1,
      eventRevision: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  return { eventId }
}

async function pricingTierInsert(
  t: ReturnType<typeof convexTest>,
  eventId: Id<"catalogEvents">,
  tierKey: string,
  priceCents: number,
  feeCents: number,
  archived = false,
): Promise<{ tierId: Id<"catalogTicketTiers"> }> {
  const tierId = await t.run(async (ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey,
      name: tierKey,
      description: "",
      priceCents,
      feeCents,
      capacity: 100,
      reserved: 0,
      sold: 0,
      ...(archived ? { archivedAt: now } : {}),
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )
  return { tierId }
}

function prepareArgs(eventKey: string, eventRevision: number, checkoutKey: string, tierKey = "standard") {
  return {
    checkoutKey,
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    customerAddress: "Street",
    customerPhone: "",
    eventKey,
    catalogVersion: 1,
    eventRevision,
    stripeMode: "test" as const,
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    locale: "de" as const,
    paymentReference: checkoutKey,
    fulfillmentEligible: true,
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
    tickets: [{ tierKey, quantity: 1, participantNames: ["Ada Lovelace"] }],
  }
}

async function pricingStep(
  t: ReturnType<typeof convexTest>,
  orgId: Id<"orgs">,
  feeRevision: number,
  page?: { eventPageSize?: number; tierPageSize?: number },
) {
  const result = await t.mutation(internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
    orgId,
    feeRevision,
    ...(page?.eventPageSize !== undefined ? { eventPageSize: page.eventPageSize } : {}),
    ...(page?.tierPageSize !== undefined ? { tierPageSize: page.tierPageSize } : {}),
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("pricing step failed")
  return result.data
}

async function pricingDrain(
  t: ReturnType<typeof convexTest>,
  orgId: Id<"orgs">,
  feeRevision: number,
  page?: { eventPageSize?: number; tierPageSize?: number },
) {
  for (let i = 0; i < 30; i += 1) {
    const step = await pricingStep(t, orgId, feeRevision, page)
    if (step.status === "done") return step
  }
  throw new Error("pricing job did not finish within the step budget")
}

async function pricingOrgRead(t: ReturnType<typeof convexTest>, orgId: Id<"orgs">) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique(),
  )
}

async function tierFeesRead(t: ReturnType<typeof convexTest>, eventId: Id<"catalogEvents">) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", eventId))
      .collect(),
  )
}

async function eventRevisionRead(t: ReturnType<typeof convexTest>, eventId: Id<"catalogEvents">) {
  const event = await t.run(async (ctx) => ctx.db.get("catalogEvents", eventId))
  return event?.eventRevision ?? 1
}

test("equal-price tiers converge to equal fees after a fee change, closed for checkout until done", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "fee-drift-org")
  const { eventId } = await pricingEventInsert(t, orgId, "fee-drift-event")
  await pricingTierInsert(t, eventId, "tier-a", 2000, 100)
  await pricingTierInsert(t, eventId, "tier-b", 2000, 150)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 50, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const updating = await pricingOrgRead(t, orgId)
  expect(updating).toMatchObject({ pricingStatus: "updating", feeRevision: 1 })
  const detail = await t.query(api.organizerDashboardAdmin.organizerDashboardAdminDetailQuery, { token, orgId })
  expect(detail.success).toBe(true)
  if (!detail.success) return
  expect(detail.data).toMatchObject({ pricingStatus: "updating", feeRevision: 1 })

  const denied = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("fee-drift-event", 1, "drift-blocked"),
  )
  expect(denied.success).toBe(false)

  const final = await pricingDrain(t, orgId, 1)
  expect(final.status).toBe("done")

  const tiers = await tierFeesRead(t, eventId)
  expect(tiers).toHaveLength(2)
  for (const tier of tiers) expect(tier.feeCents).toBe(150)
  const ready = await pricingOrgRead(t, orgId)
  expect(ready).toMatchObject({ pricingStatus: "ready", feeRevision: 1 })

  const revision = await eventRevisionRead(t, eventId)
  expect(revision).toBeGreaterThan(1)
  const allowed = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("fee-drift-event", revision, "drift-allowed", "tier-a"),
  )
  expect(allowed.success).toBe(true)
  if (!allowed.success) return
  const order = await t.run(async (ctx) => ctx.db.get("ticketOrders", allowed.data.orderId))
  expect(order).toMatchObject({ subtotalCents: 2000, feeCents: 150, totalCents: 2150 })
})

test("approval stays blocked while repricing and succeeds once the barrier clears", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "approve-gate-org", { status: "pruefung" })
  await pricingActivationConsentSet(t, orgId)
  const { eventId } = await pricingEventInsert(t, orgId, "approve-gate-event")
  await pricingTierInsert(t, eventId, "standard", 1000, 0)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const blocked = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token,
    orgId,
  })
  expect(blocked.success).toBe(false)

  await pricingDrain(t, orgId, 1)
  const approved = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token,
    orgId,
  })
  expect(approved.success).toBe(true)
})

test("checkout stays denied until a multipage job finishes every page", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "multipage-org")
  const { eventId } = await pricingEventInsert(t, orgId, "multipage-event")
  await pricingTierInsert(t, eventId, "tier-a", 1000, 0)
  await pricingTierInsert(t, eventId, "tier-b", 1000, 0)
  await pricingTierInsert(t, eventId, "tier-c", 1000, 0)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 1000, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const first = await pricingStep(t, orgId, 1, { tierPageSize: 2 })
  expect(first.status).toBe("progress")
  expect(first.stepTiersVisited).toBeLessThanOrEqual(2)
  expect((await pricingOrgRead(t, orgId))?.pricingStatus).toBe("updating")
  const denied = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("multipage-event", 1, "multipage-blocked", "tier-a"),
  )
  expect(denied.success).toBe(false)

  const final = await pricingDrain(t, orgId, 1)
  expect(final.status).toBe("done")
  const tiers = await tierFeesRead(t, eventId)
  for (const tier of tiers) expect(tier.feeCents).toBe(100)
})

test("a superseded revision never clears the barrier and duplicate runs stay idempotent", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "supersede-org")
  const { eventId } = await pricingEventInsert(t, orgId, "supersede-event")
  await pricingTierInsert(t, eventId, "standard", 1000, 0)

  const first = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
  })
  expect(first.success).toBe(true)
  const second = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 1000, fixedCents: 10, payer: "kaeufer" },
  })
  expect(second.success).toBe(true)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "updating", feeRevision: 2 })

  const stale = await pricingStep(t, orgId, 1)
  expect(stale.status).toBe("superseded")
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "updating", feeRevision: 2 })
  expect((await tierFeesRead(t, eventId))[0]?.feeCents).toBe(0)

  const final = await pricingDrain(t, orgId, 2)
  expect(final.status).toBe("done")
  expect((await tierFeesRead(t, eventId))[0]?.feeCents).toBe(110)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready", feeRevision: 2 })

  const duplicate = await pricingStep(t, orgId, 2)
  expect(duplicate.status).toBe("done")
  expect((await tierFeesRead(t, eventId))[0]?.feeCents).toBe(110)
  const staleAgain = await pricingStep(t, orgId, 1)
  expect(staleAgain.status).toBe("superseded")
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready", feeRevision: 2 })
})

test("paid order snapshots never reprice while unpaid replay waits for the barrier", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "snapshot-org", {
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
  })
  const { eventId } = await pricingEventInsert(t, orgId, "snapshot-event")
  await pricingTierInsert(t, eventId, "standard", 2000, 100)

  const paid = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("snapshot-event", 1, "snapshot-paid"),
  )
  expect(paid.success).toBe(true)
  if (!paid.success) return
  const pending = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("snapshot-event", 1, "snapshot-pending"),
  )
  expect(pending.success).toBe(true)
  if (!pending.success) return
  await t.run(async (ctx) => {
    await ctx.db.patch("ticketOrders", paid.data.orderId, { status: "paid", paymentStatus: "paid" })
  })
  const before = await t.run(async (ctx) => ({
    order: await ctx.db.get("ticketOrders", paid.data.orderId),
    lines: await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", paid.data.orderId))
      .collect(),
  }))

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 1000, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const paidReplay = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("snapshot-event", 1, "snapshot-paid"),
  )
  expect(paidReplay.success).toBe(true)
  if (paidReplay.success) expect(paidReplay.data.replayed).toBe(true)
  const pendingReplayDenied = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("snapshot-event", 1, "snapshot-pending"),
  )
  expect(pendingReplayDenied.success).toBe(false)

  await pricingDrain(t, orgId, 1)
  const after = await t.run(async (ctx) => ({
    order: await ctx.db.get("ticketOrders", paid.data.orderId),
    lines: await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", paid.data.orderId))
      .collect(),
  }))
  expect(after.order).toMatchObject({
    subtotalCents: before.order?.subtotalCents,
    feeCents: before.order?.feeCents,
    totalCents: before.order?.totalCents,
    status: "paid",
    paymentStatus: "paid",
  })
  expect(after.lines.map((line) => ({ priceCents: line.priceCents, feeCents: line.feeCents }))).toEqual(
    before.lines.map((line) => ({ priceCents: line.priceCents, feeCents: line.feeCents })),
  )
  const pendingReplayAllowed = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("snapshot-event", 1, "snapshot-pending"),
  )
  expect(pendingReplayAllowed.success).toBe(true)
  if (pendingReplayAllowed.success) expect(pendingReplayAllowed.data.replayed).toBe(true)
})

test("free tiers and organizer-payer fees both quote zero buyer fees", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "zero-fee-org", {
    fee: { percentBps: 500, fixedCents: 50, payer: "kaeufer" },
  })
  const { eventId } = await pricingEventInsert(t, orgId, "zero-fee-event")
  await pricingTierInsert(t, eventId, "free", 0, 0)
  await pricingTierInsert(t, eventId, "paid", 1000, 999)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 50, payer: "veranstalter" },
  })
  expect(configured.success).toBe(true)
  await pricingDrain(t, orgId, 1)
  const tiers = await tierFeesRead(t, eventId)
  for (const tier of tiers) expect(tier.feeCents).toBe(0)
})

test("a fee change leaves an unrelated organization untouched", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "changed-org")
  const { eventId } = await pricingEventInsert(t, orgId, "changed-event")
  await pricingTierInsert(t, eventId, "standard", 1000, 0)
  const { orgId: otherOrgId } = await pricingOrgInsert(t, "other-org")
  const { eventId: otherEventId } = await pricingEventInsert(t, otherOrgId, "other-event-seed")
  await pricingTierInsert(t, otherEventId, "standard", 1000, 0)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const otherOrg = await pricingOrgRead(t, otherOrgId)
  expect(otherOrg?.pricingStatus).toBeUndefined()
  expect(otherOrg?.feeRevision).toBeUndefined()
  const otherCheckout = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("other-event-seed", 1, "other-allowed"),
  )
  expect(otherCheckout.success).toBe(true)

  await pricingDrain(t, orgId, 1)
  const otherTiers = await tierFeesRead(t, otherEventId)
  expect(otherTiers).toHaveLength(1)
  expect(otherTiers[0]?.feeCents).toBe(0)
  expect((await tierFeesRead(t, eventId))[0]?.feeCents).toBe(50)
})

test("more than fifty tiers reprice through bounded pages without collecting the org", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "big-org")
  const { eventId } = await pricingEventInsert(t, orgId, "big-event")
  await t.run(async (ctx) => {
    for (let i = 0; i < 55; i += 1) {
      await ctx.db.insert("catalogTicketTiers", {
        eventId,
        tierKey: `bulk-${i}`,
        name: `Bulk ${i}`,
        description: "",
        priceCents: 1000,
        feeCents: 0,
        capacity: 100,
        reserved: 0,
        sold: 0,
        sortOrder: i,
        catalogVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
    }
  })

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 25, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const firstPage = await pricingStep(t, orgId, 1)
  expect(firstPage.status).toBe("progress")
  expect(firstPage.stepTiersVisited).toBeLessThanOrEqual(50)
  expect((await pricingOrgRead(t, orgId))?.pricingStatus).toBe("updating")

  const final = await pricingDrain(t, orgId, 1)
  expect(final.status).toBe("done")
  expect(final.updatedTiers).toBe(55)
  const tiers = await tierFeesRead(t, eventId)
  expect(tiers).toHaveLength(55)
  for (const tier of tiers) expect(tier.feeCents).toBe(75)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready", feeRevision: 1 })
})

test("two hundred one tiers converge across native pages even when the last page is already correct", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "sentinel-org")
  const { eventId } = await pricingEventInsert(t, orgId, "sentinel-event")
  await t.run(async (ctx) => {
    for (let i = 0; i < 201; i += 1) {
      await ctx.db.insert("catalogTicketTiers", {
        eventId,
        tierKey: `bulk-${i}`,
        name: `Bulk ${i}`,
        description: "",
        priceCents: 1000,
        feeCents: i === 200 ? 75 : 0,
        capacity: 100,
        reserved: 0,
        sold: 0,
        sortOrder: i,
        catalogVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
    }
  })

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 25, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  const first = await pricingStep(t, orgId, 1)
  expect(first.status).toBe("progress")
  expect(first.stepTiersVisited).toBeLessThanOrEqual(50)

  const final = await pricingDrain(t, orgId, 1)
  expect(final.status).toBe("done")
  expect(final.updatedTiers).toBe(200)
  const tiers = await tierFeesRead(t, eventId)
  expect(tiers).toHaveLength(201)
  for (const tier of tiers) expect(tier.feeCents).toBe(75)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready", feeRevision: 1 })
  expect(await eventRevisionRead(t, eventId)).toBeGreaterThan(1)
})

test("an event whose date moves behind the cursor is still repriced on the stable index", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "stable-cursor-org")
  const eventA = await pricingEventInsert(t, orgId, "stable-event-a")
  const eventB = await pricingEventInsert(t, orgId, "stable-event-b")
  await pricingTierInsert(t, eventA.eventId, "standard", 1000, 0)
  await pricingTierInsert(t, eventB.eventId, "standard", 1000, 0)
  await t.run(async (ctx) => {
    await ctx.db.patch("catalogEvents", eventA.eventId, { startsAt: "2026-11-01T18:00:00.000Z" })
    await ctx.db.patch("catalogEvents", eventB.eventId, { startsAt: "2026-12-01T18:00:00.000Z" })
  })

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)

  await pricingStep(t, orgId, 1)
  await t.run(async (ctx) => {
    await ctx.db.patch("catalogEvents", eventB.eventId, { startsAt: "2026-10-01T18:00:00.000Z" })
  })

  const final = await pricingDrain(t, orgId, 1)
  expect(final.status).toBe("done")
  expect(final.processedEvents).toBe(2)
  for (const eventId of [eventA.eventId, eventB.eventId]) {
    const tiers = await tierFeesRead(t, eventId)
    expect(tiers).toHaveLength(1)
    expect(tiers[0]?.feeCents).toBe(50)
  }
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready", feeRevision: 1 })
})

test("initial confirmation with an unchanged fee still reprices migrated legacy tiers", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "legacy-fee-org")
  await t.run(async (ctx) => {
    const org = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique()
    if (org) await ctx.db.patch("organizerDashboardOrganizations", org._id, { configurationConfirmed: false })
  })
  const { eventId } = await pricingEventInsert(t, orgId, "legacy-fee-event")
  await pricingTierInsert(t, eventId, "standard", 1000, 129)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "updating", feeRevision: 1 })

  const final = await pricingDrain(t, orgId, 1)
  expect(final.status).toBe("done")
  expect((await tierFeesRead(t, eventId))[0]?.feeCents).toBe(0)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready", feeRevision: 1 })
})

test("assigning a legacy event to a configured org starts the barrier and a noop replay does not", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "migration-pricing-org", {
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
  })
  const ownerId = await t.run(async (ctx) =>
    ctx.db.insert("users", { name: "migration owner", role: "customer", createdAt: now, updatedAt: now }),
  )
  await t.run(async (ctx) => {
    await ctx.db.insert("orgMembers", {
      userId: ownerId,
      orgId,
      orgHandle: "migration-pricing-org",
      role: "member",
      organizerRole: "inhaber",
      invitedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogEvents", {
      eventKey: "legacy-assign-event",
      title: "legacy-assign-event",
      subtitle: "",
      description: "",
      category: "konzerte",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "legacy-assign-event",
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Stage",
      tags: [],
      status: "published",
      catalogVersion: 1,
      eventRevision: 1,
      createdAt: now,
      updatedAt: now,
    })
  })
  const legacyEvent = await t.run(async (ctx) =>
    ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", "legacy-assign-event"))
      .unique(),
  )
  if (!legacyEvent) throw new Error("legacy event missing")
  await t.run(async (ctx) =>
    ctx.db.insert("catalogTicketTiers", {
      eventId: legacyEvent._id,
      tierKey: "standard",
      name: "standard",
      description: "",
      priceCents: 1000,
      feeCents: 0,
      capacity: 100,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    }),
  )

  const paid = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("legacy-assign-event", 1, "legacy-paid-before"),
  )
  expect(paid.success).toBe(true)
  if (!paid.success) return
  await t.run(async (ctx) => {
    await ctx.db.patch("ticketOrders", paid.data.orderId, { status: "paid", paymentStatus: "paid" })
  })
  const paidBefore = await t.run(async (ctx) => ctx.db.get("ticketOrders", paid.data.orderId))

  const applied = await t.mutation(api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation, {
    token,
    orgInits: [],
    eventAssignments: [{ eventKey: "legacy-assign-event", orgId }],
    roleAssignments: [],
  })
  expect(applied.success).toBe(true)
  if (!applied.success) return
  expect(applied.data.eventsAssigned).toBe(1)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "updating", feeRevision: 1 })

  const final = await pricingDrain(t, orgId, 1)
  expect(final.status).toBe("done")
  const tiers = await t.run(async (ctx) =>
    ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", legacyEvent._id))
      .collect(),
  )
  expect(tiers).toHaveLength(1)
  expect(tiers[0]?.feeCents).toBe(50)
  const paidAfter = await t.run(async (ctx) => ctx.db.get("ticketOrders", paid.data.orderId))
  expect(paidAfter).toMatchObject({
    subtotalCents: paidBefore?.subtotalCents,
    feeCents: paidBefore?.feeCents,
    totalCents: paidBefore?.totalCents,
  })

  const revisionAfterAssign = (await pricingOrgRead(t, orgId))?.feeRevision
  const replay = await t.mutation(api.organizerDashboardMigration.organizerDashboardMigrationApplyMutation, {
    token,
    orgInits: [],
    eventAssignments: [{ eventKey: "legacy-assign-event", orgId }],
    roleAssignments: [],
  })
  expect(replay.success).toBe(true)
  if (!replay.success) return
  expect(replay.data.eventsAssigned).toBe(0)
  expect((await pricingOrgRead(t, orgId))?.feeRevision).toBe(revisionAfterAssign)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready" })

  const fresh = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("legacy-assign-event", await eventRevisionRead(t, legacyEvent._id), "legacy-new-quote"),
  )
  expect(fresh.success).toBe(true)
  if (!fresh.success) return
  const freshOrder = await t.run(async (ctx) => ctx.db.get("ticketOrders", fresh.data.orderId))
  expect(freshOrder).toMatchObject({ feeCents: 50, totalCents: 1050 })
})

test("configuring a new organization without events finishes ready immediately", async () => {
  const t = convexTest(schema, modules)
  const { token } = await pricingAdmin(t)
  const { orgId } = await pricingOrgInsert(t, "empty-org", { status: "pruefung" })
  await pricingActivationConsentSet(t, orgId)

  const configured = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation, {
    token,
    orgId,
    tax: { status: "regel", defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
  })
  expect(configured.success).toBe(true)
  expect(await pricingOrgRead(t, orgId)).toMatchObject({ pricingStatus: "ready", feeRevision: 1 })
  const approved = await t.mutation(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation, {
    token,
    orgId,
  })
  expect(approved.success).toBe(true)
})

async function pricingActivationConsentSet(t: ReturnType<typeof convexTest>, orgId: Id<"orgs">) {
  await t.run(async (ctx) => {
    const org = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique()
    if (!org) throw new Error("Missing organization")
    await ctx.db.patch("organizerDashboardOrganizations", org._id, {
      contracts: {
        ...org.contracts,
        party: organizerContractPartyConsentFixture.contractParty,
        acceptedFee: { percentBps: 500, fixedCents: 0, payer: "kaeufer" },
        authorityConfirmed: true,
        earlyServiceStartRequested: false,
      },
    })
  })
}
