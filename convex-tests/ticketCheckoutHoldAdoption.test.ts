/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.js"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.ts"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const seededAt = "2026-10-25T00:00:00.000Z"
const eventKey = "hold-adoption"
const codedTierKey = "coded"
const plainTierKey = "plain"
const code = "ABC12345"
const holdDurationMs = 15 * 60 * 1000

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("EVENTOREN_BILLING_BASE_URL", "https://billing.example.com")
  vi.stubEnv("EVENTOREN_BILLING_ORGANIZATION_ID", "checkout-hold-adoption-test")
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
    const userId = await ctx.db.insert("users", {
      name: "Catalog",
      role: "admin",
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 1,
      status: "synced",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: seededAt,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey,
      title: "Holds",
      subtitle: "",
      description: "",
      category: "konzerte",
      startsAt: seededAt,
      endsAt: seededAt,
      doorsAt: seededAt,
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
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    const tierFields = {
      eventId,
      name: "Standard",
      description: "",
      priceCents: 100,
      feeCents: 10,
      capacity: 50,
      reserved: 0,
      sold: 0,
      maxPerOrder: 3,
      catalogVersion: 1,
      createdAt: seededAt,
      updatedAt: seededAt,
    }
    const codedTierId = await ctx.db.insert("catalogTicketTiers", {
      ...tierFields,
      tierKey: codedTierKey,
      sortOrder: 0,
      activationCodeRequired: true,
    })
    const plainTierId = await ctx.db.insert("catalogTicketTiers", {
      ...tierFields,
      tierKey: plainTierKey,
      sortOrder: 1,
      activationCodeRequired: false,
    })
    const codeId = await ctx.db.insert("ticketActivationCodes", {
      eventId,
      tierId: codedTierId,
      eventKey,
      tierKey: codedTierKey,
      code,
      number: 1,
      status: "available",
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    return { eventId, codedTierId, plainTierId, codeId }
  })
  return { t, ...seeded }
}

type Harness = Awaited<ReturnType<typeof harnessCreate>>

function checkoutArgs(
  overrides: {
    checkoutKey?: string
    guestAccessDigest?: string
    paymentReference?: string
    tickets?: {
      tierKey: string
      quantity: number
      participantNames?: string[]
      activationCode?: string
      activationCodeHoldToken?: string
    }[]
  } = {},
) {
  return {
    checkoutKey: overrides.checkoutKey ?? "hold-adoption-checkout",
    guestAccessDigest: overrides.guestAccessDigest ?? "guest-digest",
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
    paymentReference: overrides.paymentReference ?? "payment-hold-adoption",
    fulfillmentEligible: false,
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
    tickets: overrides.tickets ?? [
      { tierKey: codedTierKey, quantity: 1, participantNames: ["Ada"], activationCode: code },
    ],
  }
}

/** The browser hold of the coded product. */
async function reserve(h: Harness) {
  const reserved = await h.t.mutation(api.ticketing.ticketActivationCodeReserveMutation, {
    eventKey,
    tierKey: codedTierKey,
    code,
  })
  expect(reserved).toMatchObject({ success: true, data: { valid: true } })
  if (!reserved.success) throw new Error("reservation failed")
  return { holdToken: reserved.data.holdToken, expiresAt: reserved.data.expiresAt }
}

async function prepare(h: Harness, overrides: Parameters<typeof checkoutArgs>[0] = {}) {
  return h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, checkoutArgs(overrides))
}

async function stateRead(h: Harness) {
  return h.t.run(async (ctx) => ({
    orders: await ctx.db.query("ticketOrders").collect(),
    lines: await ctx.db.query("ticketOrderLines").collect(),
    reservations: await ctx.db.query("ticketReservations").collect(),
    codes: await ctx.db.query("ticketActivationCodes").collect(),
    histories: await ctx.db.query("ticketActivationCodeReservations").collect(),
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    attempts: await ctx.db.query("ticketPaymentAttempts").collect(),
  }))
}

test("a checkout adopts its own browser hold and inherits the hold deadline", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  // The hold is five minutes old: the inherited deadline is ten minutes away,
  // never a fresh fifteen minute window.
  await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

  const prepared = await prepare(h, {
    tickets: [
      {
        tierKey: codedTierKey,
        quantity: 1,
        participantNames: ["Ada"],
        activationCode: code,
        activationCodeHoldToken: hold.holdToken,
      },
    ],
  })
  expect(prepared).toMatchObject({ success: true, data: { replayed: false, status: "reserved" } })
  if (!prepared.success) return

  const state = await stateRead(h)
  expect(state.orders).toHaveLength(1)
  expect(state.orders[0]?.reservationExpiresAt).toBe(hold.expiresAt)
  expect(state.reservations[0]?.expiresAt).toBe(hold.expiresAt)
  expect(state.lines[0]).toMatchObject({ activationCodeId: h.codeId, quantity: 1 })
  // The order owns the code and its history starts with the adoption.
  expect(state.codes[0]).toMatchObject({ status: "reserved", orderId: state.orders[0]!._id })
  expect(state.histories).toHaveLength(1)
  expect(state.histories[0]).toMatchObject({ status: "reserved", orderId: state.orders[0]!._id })
  // The credential digest stays with the order owned code, so the browser can
  // still revalidate its own pending order.
  expect(state.codes[0]?.browserHoldDigest).toBeTruthy()
  expect(state.codes[0]?.browserHoldExpiresAt).toBe(hold.expiresAt)
  expect(state.tiers.find((tier) => tier._id === h.codedTierId)?.reserved).toBe(1)
})

test("a checkout without an adopted hold keeps the plain reservation window", async () => {
  const h = await harnessCreate()
  const prepared = await prepare(h, {
    tickets: [{ tierKey: plainTierKey, quantity: 1, participantNames: ["Ada"] }],
  })
  expect(prepared).toMatchObject({ success: true })
  const state = await stateRead(h)
  expect(state.orders[0]?.reservationExpiresAt).toBe(Date.now() + holdDurationMs)
  expect(state.reservations[0]?.expiresAt).toBe(Date.now() + holdDurationMs)
  expect(state.histories).toEqual([])
  expect(state.codes[0]?.status).toBe("available")
})

test("a foreign credential can not adopt the browser hold", async () => {
  const h = await harnessCreate()
  await reserve(h)
  const before = await stateRead(h)

  const rejected = await prepare(h, {
    tickets: [
      {
        tierKey: codedTierKey,
        quantity: 1,
        participantNames: ["Ada"],
        activationCode: code,
        activationCodeHoldToken: "f".repeat(64),
      },
    ],
  })
  expect(rejected).toMatchObject({
    success: false,
    errorMessage: "The activation code is no longer available",
  })
  expect(await stateRead(h)).toEqual(before)
})

test("a checkout without the credential can not take over a live browser hold", async () => {
  const h = await harnessCreate()
  await reserve(h)
  const before = await stateRead(h)

  const rejected = await prepare(h)
  expect(rejected).toMatchObject({
    success: false,
    errorMessage: "The activation code is no longer available",
  })
  expect(await stateRead(h)).toEqual(before)
})

test("an expired hold is never adopted", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  // The stored hold window is over, but the release did not run yet.
  await h.t.run(async (ctx) => {
    await ctx.db.patch("ticketActivationCodes", h.codeId, { browserHoldExpiresAt: Date.now() - 1000 })
  })
  const before = await stateRead(h)

  const rejected = await prepare(h, {
    tickets: [
      {
        tierKey: codedTierKey,
        quantity: 1,
        participantNames: ["Ada"],
        activationCode: code,
        activationCodeHoldToken: hold.holdToken,
      },
    ],
  })
  expect(rejected).toMatchObject({
    success: false,
    errorMessage: "The activation code is no longer available",
  })
  expect(await stateRead(h)).toEqual(before)
})

test("a released hold frees the code for a checkout without a credential", async () => {
  const h = await harnessCreate()
  await reserve(h)
  await vi.advanceTimersByTimeAsync(holdDurationMs + 1000)
  await h.t.finishInProgressScheduledFunctions()
  expect((await stateRead(h)).codes[0]?.status).toBe("available")

  const prepared = await prepare(h)
  expect(prepared).toMatchObject({ success: true })
  const state = await stateRead(h)
  expect(state.orders[0]?.reservationExpiresAt).toBe(Date.now() + holdDurationMs)
  expect(state.codes[0]).toMatchObject({ status: "reserved", orderId: state.orders[0]!._id })
  expect(state.histories).toHaveLength(1)
})

test("the order expiry runs at the inherited hold deadline", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
  const prepared = await prepare(h, {
    tickets: [
      {
        tierKey: codedTierKey,
        quantity: 1,
        participantNames: ["Ada"],
        activationCode: code,
        activationCodeHoldToken: hold.holdToken,
      },
    ],
  })
  expect(prepared).toMatchObject({ success: true })

  const expire = vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue({
    success: false,
    op: "billingEventorenTicketCheckoutExpire",
    errorMessage: "The provider is unreachable",
  })

  // One second before the inherited deadline nothing expires yet.
  await vi.advanceTimersByTimeAsync(hold.expiresAt - Date.now() - 1000)
  await h.t.finishInProgressScheduledFunctions()
  expect(expire).not.toHaveBeenCalled()
  expect((await stateRead(h)).orders[0]?.status).toBe("reserved")

  // The inherited deadline is reached: the order expiry runs on its own.
  await vi.advanceTimersByTimeAsync(2000)
  await h.t.finishInProgressScheduledFunctions()
  expect(expire).toHaveBeenCalled()
})

test("the same checkout key replays the adopted order without a new order or a refreshed deadline", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  const tickets = [
    {
      tierKey: codedTierKey,
      quantity: 1,
      participantNames: ["Ada"],
      activationCode: code,
      activationCodeHoldToken: hold.holdToken,
    },
  ]
  const opened = await prepare(h, { tickets })
  expect(opened).toMatchObject({ success: true, data: { replayed: false } })
  if (!opened.success) return
  const before = await stateRead(h)

  const replay = await prepare(h, { tickets })
  expect(replay).toMatchObject({
    success: true,
    data: { replayed: true, orderId: opened.data.orderId, status: "reserved" },
  })
  // The replay never refreshes the deadline and never writes a second order.
  expect(await stateRead(h)).toEqual(before)
  expect(before.orders[0]?.reservationExpiresAt).toBe(hold.expiresAt)
})

test("the hold credential never enters the canonical checkout evidence", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  const opened = await prepare(h, {
    tickets: [
      {
        tierKey: codedTierKey,
        quantity: 1,
        participantNames: ["Ada"],
        activationCode: code,
        activationCodeHoldToken: hold.holdToken,
      },
    ],
  })
  expect(opened).toMatchObject({ success: true })
  if (!opened.success) return
  const before = await stateRead(h)

  // The browser lost its credential but replays the very same booking.
  const replay = await prepare(h, {
    tickets: [{ tierKey: codedTierKey, quantity: 1, participantNames: ["Ada"], activationCode: code }],
  })
  expect(replay).toMatchObject({ success: true, data: { replayed: true, orderId: opened.data.orderId } })
  expect(await stateRead(h)).toEqual(before)
})

test("a different checkout key can not steal an attached code, not even with its credential", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  const tickets = [
    {
      tierKey: codedTierKey,
      quantity: 1,
      participantNames: ["Ada"],
      activationCode: code,
      activationCodeHoldToken: hold.holdToken,
    },
  ]
  const opened = await prepare(h, { tickets })
  expect(opened).toMatchObject({ success: true })
  if (!opened.success) return
  const before = await stateRead(h)

  const competing = await prepare(h, {
    checkoutKey: "hold-adoption-checkout-2",
    guestAccessDigest: "guest-digest-2",
    paymentReference: "payment-hold-adoption-2",
    tickets,
  })
  expect(competing).toMatchObject({
    success: false,
    errorMessage: "The activation code is no longer available",
  })
  expect(await stateRead(h)).toEqual(before)
})

test("a mismatching hold credential of the same product is rejected before any write", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  const before = await stateRead(h)

  const rejected = await prepare(h, {
    tickets: [
      {
        tierKey: codedTierKey,
        quantity: 1,
        participantNames: ["Ada"],
        activationCode: code,
        activationCodeHoldToken: "a".repeat(64),
      },
    ],
  })
  expect(rejected).toMatchObject({ success: false })
  expect(await stateRead(h)).toEqual(before)
  expect(hold.holdToken).not.toBe("a".repeat(64))
})

test("the public checkout action forwards the hold credential to the adoption", async () => {
  const h = await harnessCreate()
  const hold = await reserve(h)
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith("/ticket-checkout")) {
      let paymentReference = "payment_holdadoptioncheckoutkey123456789012345"
      if (typeof init?.body === "string") {
        try {
          const body = JSON.parse(init.body) as { paymentReference?: unknown }
          if (typeof body.paymentReference === "string") paymentReference = body.paymentReference
        } catch {
          // The mock only needs the payment reference of a valid JSON body.
        }
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference,
            orderReference: "order_billing1",
            stripeMode: "test",
            status: "checkout_created",
            expiresAt: null,
            url: "https://checkout.stripe.test/session",
          },
        }),
        { status: 201 },
      )
    }
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal("fetch", fetchMock)

  const checkout = await h.t.action(api.ticketing.ticketCheckoutCreateAction, {
    guestAccessToken: "guestaccesstokenfortheholdadoptiontest000",
    checkoutKey: "holdadoptioncheckoutkey123456789012345",
    eventKey,
    catalogVersion: 1,
    eventRevision: 1,
    tickets: [
      {
        tierKey: codedTierKey,
        quantity: 1,
        participantNames: ["Ada"],
        activationCode: code,
        activationCodeHoldToken: hold.holdToken,
      },
    ],
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    locale: "de" as const,
    customer: {
      email: "buyer@example.com",
      givenName: "Ada",
      familyName: "Lovelace",
      address: "Street",
      phone: "",
      billingDetails: {
        givenName: "Ada",
        familyName: "Lovelace",
        address: { line1: "Street", postalCode: "10115", city: "Berlin", country: "DE" },
      },
    },
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
    },
  })
  expect(checkout).toMatchObject({ success: true, data: { status: "checkout_created" } })

  const state = await stateRead(h)
  expect(state.orders).toHaveLength(1)
  expect(state.orders[0]?.reservationExpiresAt).toBe(hold.expiresAt)
  expect(state.codes[0]).toMatchObject({ status: "reserved", orderId: state.orders[0]!._id })
  expect(state.histories).toHaveLength(1)
})
