/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.js"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.js"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.js"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-25T00:00:00.000Z"
const eventKey = "browser-hold"
const tierKey = "standard"
const code = "ABC12345"
const holdDurationMs = 15 * 60 * 1000
type Harness = Awaited<ReturnType<typeof harnessCreate>>

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("EVENTOREN_BILLING_BASE_URL", "https://billing.example.com")
  vi.stubEnv("EVENTOREN_BILLING_ORGANIZATION_ID", "browser-hold-test")
  vi.stubEnv("EVENTOREN_BILLING_API_CREDENTIAL", "test-only")
  vi.stubEnv("EVENTOREN_BILLING_STRIPE_MODE", "test")
  vi.stubEnv("EVENTOREN_PUBLIC_BASE_URL", "https://example.com")
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

async function harnessCreate() {
  const t = convexTest(schema, modules)
  const seeded = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Buyer", role: "user", createdAt: now, updatedAt: now })
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 1,
      status: "synced",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey,
      title: "Browser hold",
      subtitle: "",
      description: "",
      category: "konzerte",
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
      status: "published",
      catalogVersion: 1,
      eventRevision: 1,
      createdAt: now,
      updatedAt: now,
    })
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey,
      name: "Standard",
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
      eventKey,
      tierKey,
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
    eventKey,
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
    tickets: [{ tierKey, quantity: 1, participantNames: ["Ada"], activationCode: code }],
  }
  return { t, ...seeded, args }
}

/** The order A that owned the code and lost it with a definitive unpaid end state. */
async function orderPrepare(h: Harness) {
  const result = await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, h.args)
  expect(result).toMatchObject({ success: true })
  if (!result.success) throw new Error(result.errorMessage)
  return {
    orderId: result.data.orderId,
    paymentReference: h.args.paymentReference,
    billingOrderReference: "billing-a",
    stripeMode: "test" as const,
  }
}

async function codeRowRead(h: Harness) {
  return h.t.run(async (ctx) => await ctx.db.get("ticketActivationCodes", h.codeId))
}

async function stateRead(h: Harness) {
  return h.t.run(async (ctx) => ({
    orders: await ctx.db.query("ticketOrders").collect(),
    lines: await ctx.db.query("ticketOrderLines").collect(),
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    reservations: await ctx.db.query("ticketReservations").collect(),
    codes: await ctx.db.query("ticketActivationCodes").collect(),
    histories: await ctx.db.query("ticketActivationCodeReservations").collect(),
    tickets: await ctx.db.query("ticketIssued").collect(),
  }))
}

/** A released order A and the live browser hold of another browser on the freed code. */
async function releasedOrderWithBrowserHold(h: Harness) {
  const a = await orderPrepare(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
      orderId: a.orderId,
      reason: "Authoritative not found",
    }),
  ).toMatchObject({ success: true })
  const reserved = await h.t.mutation(api.ticketing.ticketActivationCodeReserveMutation, { eventKey, tierKey, code })
  expect(reserved).toMatchObject({ success: true, data: { valid: true } })
  if (!reserved.success) throw new Error(reserved.errorMessage)
  const held = await codeRowRead(h)
  expect(held).toMatchObject({ status: "reserved" })
  expect(held?.orderId).toBeUndefined()
  expect(held?.browserHoldDigest).toBeTruthy()
  expect(held?.browserHoldExpiresAt).toBe(reserved.data.expiresAt)
  // A prehold has no order and no order history yet.
  const state = await stateRead(h)
  expect(state.histories).toHaveLength(1)
  expect(state.histories[0]).toMatchObject({ orderId: a.orderId, status: "released" })
  return { a, holdToken: reserved.data.holdToken, held }
}

/**
 * The order expiry of the settled order must not reschedule itself: the
 * provider has no payment context for a definitively settled order.
 */
function mockBillingWithoutPaymentContext() {
  vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue({
    success: true,
    data: { kind: "not_found" },
  })
}

test("a late payment charges the code under a live browser hold and settles the order without tickets", async () => {
  const h = await harnessCreate()
  const { a, held } = await releasedOrderWithBrowserHold(h)

  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", paymentStatus: "paid", ticketCount: 0 } })

  const settled = await stateRead(h)
  expect(settled.orders[0]).toMatchObject({ status: "paid_inventory_conflict", paymentStatus: "paid" })
  // The paid order never gets a ticket: its reservation was already released.
  expect(settled.tickets).toHaveLength(0)
  // The charge scar is recorded, the browser hold keeps its own structure.
  expect(settled.codes[0]).toMatchObject({ status: "reserved", consumedAt: expect.any(String) })
  expect(settled.codes[0]?.orderId).toBeUndefined()
  expect(settled.codes[0]?.browserHoldDigest).toBe(held?.browserHoldDigest)
  expect(settled.codes[0]?.browserHoldExpiresAt).toBe(held?.browserHoldExpiresAt)
  // The paid order consumed the code history.
  expect(settled.histories[0]).toMatchObject({ orderId: a.orderId, status: "consumed" })
})

test("the browser can neither use nor adopt the code after the late payment", async () => {
  const h = await harnessCreate()
  const { a, holdToken } = await releasedOrderWithBrowserHold(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true })

  const holder = await h.t.mutation(api.ticketing.ticketActivationCodeReserveMutation, {
    eventKey,
    tierKey,
    code,
    holdToken,
  })
  expect(holder).toMatchObject({ success: true, data: { valid: false } })
  const anonymous = await h.t.mutation(api.ticketing.ticketActivationCodeReserveMutation, { eventKey, tierKey, code })
  expect(anonymous).toMatchObject({ success: true, data: { valid: false } })
  // A checkout can not adopt the charged code either.
  expect(
    await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      checkoutKey: "checkout-b",
      paymentReference: "payment-b",
      guestAccessDigest: "guest-b",
    }),
  ).toMatchObject({ success: false })
  // The rejected requests changed nothing.
  const settled = await stateRead(h)
  expect(settled.orders).toHaveLength(1)
  expect(settled.tickets).toHaveLength(0)
  expect(settled.codes[0]?.status).toBe("reserved")
})

test("the exact hold expiry finalizes the charged code as consumed and never available", async () => {
  const h = await harnessCreate()
  const { a, held } = await releasedOrderWithBrowserHold(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true })
  const chargedAt = (await codeRowRead(h))?.consumedAt
  mockBillingWithoutPaymentContext()

  await vi.advanceTimersByTimeAsync(holdDurationMs + 1000)
  await h.t.finishAllScheduledFunctions(vi.runAllTimers)

  const finalized = await codeRowRead(h)
  expect(finalized?.status).toBe("consumed")
  expect(finalized?.orderId).toBe(a.orderId)
  expect(finalized?.consumedAt).toBe(chargedAt)
  expect(finalized?.browserHoldDigest).toBeUndefined()
  expect(finalized?.browserHoldExpiresAt).toBeUndefined()
  expect(finalized?.reservedAt).toBeUndefined()
  const state = await stateRead(h)
  expect(state.codes[0]?.status).not.toBe("available")
  expect(state.tickets).toHaveLength(0)
  expect(state.histories[0]).toMatchObject({ orderId: a.orderId, status: "consumed" })
  expect(held?.browserHoldDigest).toBeTruthy()
})

test("a stale hold expiry neither finalizes nor releases the charged code", async () => {
  const h = await harnessCreate()
  const { a, held } = await releasedOrderWithBrowserHold(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true })

  const stale = await h.t.mutation(internal.ticketing.ticketActivationCodeHoldExpireMutation, {
    codeId: h.codeId,
    holdDigest: "0".repeat(64),
    expiresAt: held?.browserHoldExpiresAt ?? 0,
  })
  expect(stale).toMatchObject({ success: true, data: { released: false } })
  const unchanged = await codeRowRead(h)
  expect(unchanged?.status).toBe("reserved")
  expect(unchanged?.orderId).toBeUndefined()
  expect(unchanged?.browserHoldDigest).toBe(held?.browserHoldDigest)
  expect(unchanged?.browserHoldExpiresAt).toBe(held?.browserHoldExpiresAt)

  // The exact hold of this browser still finalizes the charged code.
  mockBillingWithoutPaymentContext()
  await vi.advanceTimersByTimeAsync(holdDurationMs + 1000)
  const finalized = await codeRowRead(h)
  expect(finalized?.status).toBe("consumed")
  expect(finalized?.orderId).toBe(a.orderId)
})

test("a duplicate late payment and a repeated expiry change nothing", async () => {
  const h = await harnessCreate()
  const { a } = await releasedOrderWithBrowserHold(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true })
  const settled = await stateRead(h)

  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", ticketCount: 0 } })
  expect(await stateRead(h)).toEqual(settled)

  mockBillingWithoutPaymentContext()
  await vi.advanceTimersByTimeAsync(holdDurationMs + 1000)
  await h.t.finishAllScheduledFunctions(vi.runAllTimers)
  const finalized = await stateRead(h)
  expect(finalized.codes[0]).toMatchObject({ status: "consumed", orderId: a.orderId })

  const repeated = await h.t.mutation(internal.ticketing.ticketActivationCodeHoldExpireMutation, {
    codeId: h.codeId,
    holdDigest: settled.codes[0]?.browserHoldDigest ?? "",
    expiresAt: settled.codes[0]?.browserHoldExpiresAt ?? 0,
  })
  expect(repeated).toMatchObject({ success: true, data: { released: false } })
  expect(await stateRead(h)).toEqual(finalized)

  // The finalized code keeps the paid order as its owner: a repeated payment
  // status changes nothing but the order timestamp.
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", ticketCount: 0 } })
  const afterRepeat = await stateRead(h)
  expect(afterRepeat.codes).toEqual(finalized.codes)
  expect(afterRepeat.histories).toEqual(finalized.histories)
  expect(afterRepeat.tickets).toEqual(finalized.tickets)
  expect(afterRepeat.orders[0]).toMatchObject({ status: "paid_inventory_conflict", paymentStatus: "paid" })
})

test("a charged hold without a proven paid owner is never released", async () => {
  const h = await harnessCreate()
  const { held } = await releasedOrderWithBrowserHold(h)
  // A charge scar without a paid owner is not a proof: the code stays blocked.
  await h.t.run((ctx) => ctx.db.patch("ticketActivationCodes", h.codeId, { consumedAt: now }))

  mockBillingWithoutPaymentContext()
  await vi.advanceTimersByTimeAsync(holdDurationMs + 1000)
  const expired = await h.t.mutation(internal.ticketing.ticketActivationCodeHoldExpireMutation, {
    codeId: h.codeId,
    holdDigest: held?.browserHoldDigest ?? "",
    expiresAt: held?.browserHoldExpiresAt ?? 0,
  })
  expect(expired).toMatchObject({ success: true, data: { released: false } })
  const row = await codeRowRead(h)
  expect(row?.status).toBe("reserved")
  expect(row?.status).not.toBe("available")
  expect(row?.orderId).toBeUndefined()
})
