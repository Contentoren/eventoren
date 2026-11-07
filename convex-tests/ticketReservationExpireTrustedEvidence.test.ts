/// <reference types="vite/client" />

import { getFunctionName } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { createResult, createResultError } from "#result"
import { internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import type { ActionCtx } from "../convex/_generated/server.js"
import schema from "../convex/schema.js"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.js"
import { ticketReservationExpireAction } from "../src/ticketing/convex/ticketReservationExpireAction.js"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.js"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.js"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-12T00:00:00.000Z"
const code = "ABC12345"
type Harness = Awaited<ReturnType<typeof harnessCreate>>

beforeEach(() => {
  vi.stubEnv("EVENTOREN_BILLING_BASE_URL", "https://billing.example.com")
  vi.stubEnv("EVENTOREN_BILLING_ORGANIZATION_ID", "expire-evidence-test")
  vi.stubEnv("EVENTOREN_BILLING_API_CREDENTIAL", "test-only")
  vi.stubEnv("EVENTOREN_BILLING_STRIPE_MODE", "test")
  vi.stubEnv("EVENTOREN_PUBLIC_BASE_URL", "https://example.com")
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function harnessCreate() {
  const t = convexTest(schema, modules)
  const seeded = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Catalog", role: "admin", createdAt: now, updatedAt: now })
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 1,
      status: "synced",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      title: "Codes",
      subtitle: "",
      description: "",
      category: "konzerte" as const,
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Eventoren",
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Stage",
      tags: [],
      status: "published" as const,
      eventKey: "expire-evidence",
      catalogVersion: 1,
      eventRevision: 1,
      createdAt: now,
      updatedAt: now,
    })
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "a",
      name: "a",
      description: "",
      priceCents: 100,
      feeCents: 10,
      capacity: 50,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      maxPerOrder: 3,
      activationCodeRequired: true,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const codeId = await ctx.db.insert("ticketActivationCodes", {
      eventId,
      tierId,
      eventKey: "expire-evidence",
      tierKey: "a",
      code,
      number: 1,
      status: "available",
      createdAt: now,
      updatedAt: now,
    })
    return { eventId, tierId, codeId }
  })
  const args = {
    checkoutKey: "checkout-a",
    guestAccessDigest: "guest-a",
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    customerAddress: "Street",
    customerPhone: "",
    eventKey: "expire-evidence",
    catalogVersion: 1,
    eventRevision: 1,
    stripeMode: "test" as const,
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    locale: "de" as const,
    paymentReference: "payment-a",
    fulfillmentEligible: true,
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
    tickets: [{ tierKey: "a", quantity: 1, participantNames: ["Ada"], activationCode: code }],
  }
  return { t, ...seeded, args }
}

/** A checkout whose own code is reserved and whose tickets were issued early (SEPA processing). */
async function earlyIssuedOrderCreate(h: Harness) {
  vi.stubEnv("EVENTOREN_SEPA_EARLY_TICKET_ISSUANCE_ENABLED", "true")
  const prepared = await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, h.args)
  expect(prepared.success).toBe(true)
  if (!prepared.success) throw new Error(prepared.errorMessage)
  const correlation = {
    orderId: prepared.data.orderId,
    paymentReference: "payment-a",
    billingOrderReference: "billing-a",
    stripeMode: "test" as const,
  }
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
      ...correlation,
      payment: "pending",
      checkoutCompletedAt: now,
      paymentMethodType: "sepa_debit",
      stripePaymentIntentStatus: "processing",
    }),
  ).toMatchObject({ success: true, data: { ticketCount: 1 } })
  const state = await stateRead(h)
  expect(state.orders[0]?.ticketsIssuedAt).toBeDefined()
  expect(state.tickets).toHaveLength(1)
  expect(state.codes[0]).toMatchObject({ status: "reserved", orderId: correlation.orderId })
  return correlation
}

async function stateRead(h: Harness) {
  return h.t.run(async (ctx) => ({
    orders: await ctx.db.query("ticketOrders").collect(),
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    reservations: await ctx.db.query("ticketReservations").collect(),
    codes: await ctx.db.query("ticketActivationCodes").collect(),
    histories: await ctx.db.query("ticketActivationCodeReservations").collect(),
    attempts: await ctx.db.query("ticketPaymentAttempts").collect(),
    tickets: await ctx.db.query("ticketIssued").collect(),
    work: await ctx.db.query("ticketFulfillmentWork").collect(),
  }))
}

test("a provider-confirmed expiry frees the own code and cancels the early tickets of an unpaid order", async () => {
  const h = await harnessCreate()
  const correlation = await earlyIssuedOrderCreate(h)
  await h.t.run(async (ctx) =>
    ctx.db.patch("ticketOrders", correlation.orderId, {
      expireErrorDeferralCount: 15,
      expireAttentionSince: now,
    }),
  )
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, {
      ...correlation,
      reason: "Billing confirmed that the checkout session expired",
      paymentConfirmedExpired: true,
    }),
  ).toMatchObject({
    success: true,
    data: { status: "expired", paymentStatus: "expired", expired: true, released: true, paid: false },
  })
  const expired = await stateRead(h)
  expect(expired.orders[0]).toMatchObject({ status: "expired", paymentStatus: "expired" })
  expect(expired.orders[0]?.expireErrorDeferralCount).toBeUndefined()
  expect(expired.orders[0]?.expireAttentionSince).toBeUndefined()
  // The own code of the definitively unpaid order is free again.
  expect(expired.codes[0]).toMatchObject({ status: "available" })
  expect(expired.codes[0]?.orderId).toBeUndefined()
  expect(expired.codes[0]?.consumedAt).toBeUndefined()
  expect(expired.histories[0]?.status).toBe("released")
  // No valid admission survives the confirmed expiry.
  expect(expired.tickets).toHaveLength(1)
  expect(expired.tickets[0]?.cancelled).toBe(true)
  expect(expired.work.every((entry) => entry.cancelledAt !== undefined)).toBe(true)
  // The early issuance already sold the tickets: the inventory is not restocked.
  expect(expired.tiers[0]).toMatchObject({ reserved: 0, sold: 1 })
  expect(expired.attempts[0]).toMatchObject({ status: "expired" })
  // The freed code is reservable again by a new checkout.
  expect(
    await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      checkoutKey: "checkout-b",
      paymentReference: "payment-b",
      guestAccessDigest: "guest-b",
    }),
  ).toMatchObject({ success: true, data: { replayed: false, status: "reserved" } })
  const reservedAgain = await stateRead(h)
  expect(reservedAgain.codes[0]).toMatchObject({ status: "reserved" })
  expect(reservedAgain.codes[0]?.orderId).not.toBe(correlation.orderId)
})

test("error deferrals back off and alert once; a normal pending deferral resets the streak", async () => {
  const h = await harnessCreate()
  const correlation = await earlyIssuedOrderCreate(h)
  const log = vi.spyOn(console, "error").mockImplementation(() => {})
  let attentionSince: string | undefined
  for (let count = 1; count <= 16; count++) {
    const before = Date.now()
    await h.t.mutation(internal.ticketing.ticketReservationDeferMutation, {
      orderId: correlation.orderId,
      reason: "Billing unavailable",
      isError: true,
    })
    const order = (await stateRead(h)).orders[0]!
    expect(order.expireErrorDeferralCount).toBe(count)
    const delay = 15 * 60 * 1000 * (count < 8 ? 1 : Math.min(24, 2 ** Math.min(count - 7, 5)))
    expect(order.reservationExpiresAt).toBeGreaterThanOrEqual(before + delay)
    expect(order.reservationExpiresAt).toBeLessThanOrEqual(Date.now() + delay)
    if (count < 15) expect(order.expireAttentionSince).toBeUndefined()
    if (count === 15) {
      expect(order.expireAttentionSince).toBeDefined()
      attentionSince = order.expireAttentionSince
    }
    if (count === 16) expect(order.expireAttentionSince).toBe(attentionSince)
  }
  expect(log).toHaveBeenCalledTimes(1)
  expect(log).toHaveBeenCalledWith(
    "ticket_reservation_expiry_attention",
    expect.objectContaining({
      orderId: correlation.orderId,
      paymentReference: "payment-a",
      reason: "Billing unavailable",
      count: 15,
    }),
  )
  await h.t.mutation(internal.ticketing.ticketReservationDeferMutation, {
    orderId: correlation.orderId,
    reason: "Payment pending",
    isError: false,
  })
  const order = (await stateRead(h)).orders[0]!
  expect(order.expireErrorDeferralCount).toBeUndefined()
  expect(order.expireAttentionSince).toBeUndefined()
  expect(order.reservationExpiresAt).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000)
})

test("an early issuance without a provider-confirmed expiry keeps the code and the tickets", async () => {
  const h = await harnessCreate()
  const correlation = await earlyIssuedOrderCreate(h)
  const before = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, {
      ...correlation,
      reason: "Billing confirmed that the checkout session expired",
    }),
  ).toMatchObject({ success: true, data: { expired: false, released: false, paid: false } })
  const unchanged = await stateRead(h)
  expect(unchanged.codes).toEqual(before.codes)
  expect(unchanged.histories).toEqual(before.histories)
  expect(unchanged.tickets).toEqual(before.tickets)
  expect(unchanged.orders[0]).toMatchObject({ status: "reserved", paymentStatus: "pending" })
})

test("a paid order is never freed by a provider-confirmed expiry", async () => {
  const h = await harnessCreate()
  const correlation = await earlyIssuedOrderCreate(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...correlation, payment: "paid" }),
  ).toMatchObject({ success: true, data: { status: "paid", paymentStatus: "paid" } })
  const before = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, {
      ...correlation,
      reason: "Billing confirmed that the checkout session expired",
      paymentConfirmedExpired: true,
    }),
  ).toMatchObject({ success: true, data: { paid: true, expired: false, released: false } })
  const unchanged = await stateRead(h)
  expect(unchanged.codes).toEqual(before.codes)
  expect(unchanged.histories).toEqual(before.histories)
  expect(unchanged.tickets).toEqual(before.tickets)
})

test("a repeated provider-confirmed expiry of the same order stays idempotent", async () => {
  const h = await harnessCreate()
  const correlation = await earlyIssuedOrderCreate(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, {
      ...correlation,
      reason: "Billing confirmed that the checkout session expired",
      paymentConfirmedExpired: true,
    }),
  ).toMatchObject({ success: true, data: { expired: true, released: true } })
  const expired = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, {
      ...correlation,
      reason: "Billing confirmed that the checkout session expired",
      paymentConfirmedExpired: true,
    }),
  ).toMatchObject({ success: true, data: { expired: true, released: false } })
  expect(await stateRead(h)).toEqual(expired)
})

/** Historical state of an early issuance that charged the code before the payment settled. */
async function historicalEarlyIssuanceSeed(h: Harness, order: Id<"ticketOrders">) {
  await h.t.run(async (ctx) => {
    const seeded = await ctx.db.get("ticketOrders", order)
    if (!seeded) throw new Error("The order was not found")
    await ctx.db.patch("ticketOrders", order, { ticketsIssuedAt: now })
    await ctx.db.patch("ticketActivationCodes", h.codeId, { status: "consumed", consumedAt: now })
    const history = await ctx.db
      .query("ticketActivationCodeReservations")
      .withIndex("orderId", (q) => q.eq("orderId", order))
      .unique()
    await ctx.db.patch("ticketActivationCodeReservations", history!._id, { status: "consumed" })
    const reservation = await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", order))
      .unique()
    await ctx.db.patch("ticketReservations", reservation!._id, { status: "consumed" })
    const tier = await ctx.db.get("catalogTicketTiers", reservation!.tierId)
    await ctx.db.patch("catalogTicketTiers", reservation!.tierId, {
      reserved: tier!.reserved - reservation!.quantity,
      sold: tier!.sold + reservation!.quantity,
    })
    await ctx.db.insert("ticketIssued", {
      orderId: order,
      sequence: 1,
      code: "TKT-HISTORIC01",
      eventKey: seeded.eventKey,
      eventTitle: seeded.eventTitle,
      eventStartsAt: seeded.eventStartsAt,
      eventDoorsAt: seeded.eventDoorsAt,
      venue: seeded.venue,
      city: seeded.city,
      address: seeded.address,
      tierKey: "a",
      tierName: "a",
      priceCents: 100,
      feeCents: 10,
      issuedAt: now,
    })
  })
}

test("a provider-confirmed expiry also frees an own early-issued code that was charged historically", async () => {
  const h = await harnessCreate()
  const correlation = await earlyIssuedOrderCreate(h)
  await historicalEarlyIssuanceSeed(h, correlation.orderId)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, {
      ...correlation,
      reason: "Billing confirmed that the checkout session expired",
      paymentConfirmedExpired: true,
    }),
  ).toMatchObject({ success: true, data: { status: "expired", expired: true, released: true } })
  const expired = await stateRead(h)
  expect(expired.codes[0]).toMatchObject({ status: "available" })
  expect(expired.codes[0]?.orderId).toBeUndefined()
  expect(expired.codes[0]?.consumedAt).toBeUndefined()
  expect(expired.histories[0]?.status).toBe("released")
  expect(expired.tickets[0]?.cancelled).toBe(true)
})

const orderId = "order" as Id<"ticketOrders">
const providerStatus = {
  paymentReference: "payment-a",
  orderReference: "billing-a",
  stripeMode: "test" as const,
  status: "expired" as const,
  payment: "expired" as const,
  expiresAt: null,
  bookingNumber: null,
  bookingReference: null,
}

function actionContextCreate() {
  const runQuery = vi.fn().mockResolvedValue(
    createResult({
      paymentReference: providerStatus.paymentReference,
      billingOrderReference: providerStatus.orderReference,
      stripeMode: "test",
      status: "checkout_created",
      paymentStatus: "pending",
    }),
  )
  const runMutation = vi.fn().mockResolvedValue(createResult({ orderId, status: "expired", paymentStatus: "expired" }))
  const runAfter = vi.fn()
  const ctx = { runQuery, runMutation, scheduler: { runAfter } } as unknown as ActionCtx
  return { ctx, runQuery, runMutation }
}

test("the expiry action forwards the trusted evidence only for a provider-confirmed expiry", async () => {
  const { ctx, runMutation } = actionContextCreate()
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
    createResult({ kind: "status", data: providerStatus }),
  )
  await ticketReservationExpireAction._handler(ctx, { orderId })
  expect(runMutation).toHaveBeenCalledOnce()
  expect(getFunctionName(runMutation.mock.calls[0]![0])).toBe("ticketing:ticketReservationExpireMutation")
  expect(runMutation.mock.calls[0]![1]).toMatchObject({
    orderId,
    paymentReference: providerStatus.paymentReference,
    billingOrderReference: providerStatus.orderReference,
    paymentConfirmedExpired: true,
  })
})

test("the expiry action never claims the trusted evidence for a pending payment", async () => {
  const { ctx, runMutation } = actionContextCreate()
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
    createResult({ kind: "status", data: { ...providerStatus, status: "checkout_created", payment: "pending" } }),
  )
  expect(await ticketReservationExpireAction._handler(ctx, { orderId })).toMatchObject({
    success: true,
    data: { action: "deferred" },
  })
  expect(runMutation.mock.calls.map(([reference]) => getFunctionName(reference))).toEqual([
    "ticketing:ticketPaymentStatusApplyMutation",
    "ticketing:ticketReservationDeferMutation",
  ])
  expect(runMutation.mock.calls[0]![1]).not.toHaveProperty("paymentConfirmedExpired")
})

test.each(["expired", "not_found"] as const)(
  "a failed local %s transition is counted as an error and schedules another expiry attempt",
  async (outcome) => {
    const { ctx, runMutation } = actionContextCreate()
    vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
      createResult(outcome === "not_found" ? { kind: "not_found" } : { kind: "status", data: providerStatus }),
    )
    runMutation.mockResolvedValueOnce(createResultError("localTransition", "Inventory needs repair"))
    expect(await ticketReservationExpireAction._handler(ctx, { orderId })).toMatchObject({ success: false })
    expect(runMutation.mock.calls.map(([reference]) => getFunctionName(reference))).toEqual([
      outcome === "not_found"
        ? "ticketing:ticketReservationReleaseMutation"
        : "ticketing:ticketReservationExpireMutation",
      "ticketing:ticketReservationDeferMutation",
    ])
    expect(runMutation.mock.calls[1]![1]).toMatchObject({ orderId, reason: "Inventory needs repair", isError: true })
  },
)

test("the expiry action never claims the trusted evidence when the provider fails", async () => {
  const { ctx, runMutation } = actionContextCreate()
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
    createResultError("provider", "Unavailable"),
  )
  expect(await ticketReservationExpireAction._handler(ctx, { orderId })).toMatchObject({ success: false })
  expect(runMutation.mock.calls.map(([reference]) => getFunctionName(reference))).toEqual([
    "ticketing:ticketReservationDeferMutation",
  ])
  expect(runMutation.mock.calls[0]![1]).not.toHaveProperty("paymentConfirmedExpired")
})

test("the expiry action never claims the trusted evidence for a foreign payment response", async () => {
  const { ctx, runMutation } = actionContextCreate()
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue(
    createResult({ kind: "status", data: { ...providerStatus, paymentReference: "payment-foreign" } }),
  )
  await ticketReservationExpireAction._handler(ctx, { orderId })
  expect(getFunctionName(runMutation.mock.calls[0]![0])).toBe("ticketing:ticketReservationExpireMutation")
  expect(runMutation.mock.calls[0]![1]).toMatchObject({ paymentConfirmedExpired: false })
})
