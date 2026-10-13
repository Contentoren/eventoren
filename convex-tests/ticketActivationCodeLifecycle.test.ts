/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.js"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.js"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-12T00:00:00.000Z"
const codes = ["ABC12345", "DEF67890", "XYZ12345"]
type Harness = Awaited<ReturnType<typeof harnessCreate>>

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("EVENTOREN_BILLING_BASE_URL", "https://billing.example.com")
  vi.stubEnv("EVENTOREN_BILLING_ORGANIZATION_ID", "activation-code-test")
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
    const userId = await ctx.db.insert("users", { name: "Catalog", role: "admin", createdAt: now, updatedAt: now })
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 1,
      status: "synced",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    const eventFields = {
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
      catalogVersion: 1,
      eventRevision: 1,
      createdAt: now,
      updatedAt: now,
    }
    const eventId = await ctx.db.insert("catalogEvents", { ...eventFields, eventKey: "codes" })
    const otherEventId = await ctx.db.insert("catalogEvents", { ...eventFields, eventKey: "other" })
    const tierIds: Id<"catalogTicketTiers">[] = []
    for (const tierKey of ["a", "b"])
      tierIds.push(
        await ctx.db.insert("catalogTicketTiers", {
          eventId,
          tierKey,
          name: tierKey,
          description: "",
          priceCents: 100,
          feeCents: 10,
          capacity: 50,
          reserved: 0,
          sold: 0,
          sortOrder: tierIds.length,
          maxPerOrder: 3,
          activationCodeRequired: true,
          catalogVersion: 1,
          createdAt: now,
          updatedAt: now,
        }),
      )
    const codeIds: Id<"ticketActivationCodes">[] = []
    for (let index = 0; index < codes.length; index += 1)
      codeIds.push(
        await ctx.db.insert("ticketActivationCodes", {
          eventId,
          tierId: tierIds[index === 2 ? 1 : 0]!,
          eventKey: "codes",
          tierKey: index === 2 ? "b" : "a",
          code: codes[index]!,
          number: index + 1,
          status: "available",
          createdAt: now,
          updatedAt: now,
        }),
      )
    return { eventId, otherEventId, tierIds, codeIds }
  })
  const args = {
    checkoutKey: "checkout-a",
    guestAccessDigest: "guest-a",
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    customerAddress: "Street",
    customerPhone: "",
    eventKey: "codes",
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
    tickets: [{ tierKey: "a", quantity: 1, participantNames: ["Ada"], activationCode: codes[0]! }],
  }
  return { t, ...seeded, args }
}

async function orderPrepare(h: Harness, key = "a") {
  const result = await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
    ...h.args,
    checkoutKey: `checkout-${key}`,
    paymentReference: `payment-${key}`,
    guestAccessDigest: `guest-${key}`,
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error(result.errorMessage)
  return {
    orderId: result.data.orderId,
    paymentReference: `payment-${key}`,
    billingOrderReference: `billing-${key}`,
    stripeMode: "test" as const,
  }
}

test.each(["guest", "owner"])(
  "scheduled booking rejects %s checkout before opening without reservations or code consumption",
  async (identity) => {
    const h = await harnessCreate()
    const opensAt = Date.parse("2026-10-13T18:00:00.000Z")
    vi.setSystemTime(opensAt - 1)
    const ownerUserId = await h.t.run(async (ctx) => {
      await ctx.db.patch("catalogEvents", h.eventId, { bookingOpensAt: new Date(opensAt).toISOString() })
      return ctx.db.insert("users", { name: "Existing contact", role: "user", createdAt: now, updatedAt: now })
    })
    const rejected = await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      ...(identity === "owner" ? { ownerUserId } : {}),
    })
    expect(rejected).toMatchObject({ success: false, errorMessage: "Booking for this event is not open yet" })
    const state = await stateRead(h)
    expect(state.orders).toEqual([])
    expect(state.lines).toEqual([])
    expect(state.reservations).toEqual([])
    expect(state.histories).toEqual([])
    expect(state.tiers.every((tier) => tier.reserved === 0 && tier.sold === 0)).toBe(true)
    expect(state.codes.every((code) => code.status === "available")).toBe(true)

    vi.setSystemTime(opensAt)
    const allowed = await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      ...(identity === "owner" ? { ownerUserId } : {}),
    })
    expect(allowed).toMatchObject({ success: true, data: { replayed: false, status: "reserved" } })
    const opened = await stateRead(h)
    expect(opened.orders).toHaveLength(1)
    expect(opened.reservations).toHaveLength(1)
    expect(opened.codes.find((code) => code.code === codes[0])?.status).toBe("reserved")
  },
)

test("an existing checkout cannot replay through a newly scheduled booking restriction", async () => {
  const h = await harnessCreate()
  const opened = await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, h.args)
  expect(opened.success).toBe(true)
  await h.t.run(async (ctx) =>
    ctx.db.patch("catalogEvents", h.eventId, {
      bookingOpensAt: new Date(Date.now() + 60_000).toISOString(),
    }),
  )
  const beforeReplay = await stateRead(h)
  const replay = await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, h.args)
  expect(replay).toMatchObject({ success: false, errorMessage: "Booking for this event is not open yet" })
  expect(await stateRead(h)).toEqual(beforeReplay)
})

async function stateRead(h: Harness) {
  return h.t.run(async (ctx) => ({
    orders: await ctx.db.query("ticketOrders").collect(),
    lines: await ctx.db.query("ticketOrderLines").collect(),
    tiers: await ctx.db.query("catalogTicketTiers").collect(),
    reservations: await ctx.db.query("ticketReservations").collect(),
    codes: await ctx.db.query("ticketActivationCodes").collect(),
    histories: await ctx.db.query("ticketActivationCodeReservations").collect(),
    attempts: await ctx.db.query("ticketPaymentAttempts").collect(),
    tickets: await ctx.db.query("ticketIssued").collect(),
    deliveries: await ctx.db.query("ticketOrderDeliveries").collect(),
    work: await ctx.db.query("ticketFulfillmentWork").collect(),
  }))
}

test.each(["missing", "malformed", "unknown", "wrong product", "wrong event"])(
  "required code rejects %s before creating any order, inventory or history",
  async (kind) => {
    const h = await harnessCreate()
    if (kind === "wrong event")
      await h.t.run((ctx) =>
        ctx.db.patch("ticketActivationCodes", h.codeIds[0]!, { eventId: h.otherEventId, eventKey: "other" }),
      )
    const before = await stateRead(h)
    const activationCode =
      kind === "missing"
        ? undefined
        : kind === "malformed"
          ? "!"
          : kind === "unknown"
            ? "NOPE1234"
            : kind === "wrong product"
              ? codes[2]
              : codes[0]
    expect(
      await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
        ...h.args,
        tickets: [
          {
            tierKey: "a",
            quantity: 1,
            participantNames: ["Ada"],
            ...(activationCode === undefined ? {} : { activationCode }),
          },
        ],
      }),
    ).toMatchObject({ success: false })
    expect(await stateRead(h)).toEqual(before)
  },
)

test("one normalized code authorizes aggregated quantity up to the unchanged maxPerOrder", async () => {
  const h = await harnessCreate()
  const tickets = [
    { tierKey: "a", quantity: 1, participantNames: ["Ada"], activationCode: " abc12345 " },
    { tierKey: "a", quantity: 2, participantNames: ["Bob", "Cy"], activationCode: "ABC12345" },
  ]
  expect(await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, { ...h.args, tickets })).toMatchObject({
    success: true,
  })
  const state = await stateRead(h)
  expect(state.lines).toHaveLength(1)
  expect(state.lines[0]).toMatchObject({ quantity: 3, activationCodeId: h.codeIds[0] })
  expect(state.histories).toHaveLength(1)
  expect(state.codes[0]).toMatchObject({ status: "reserved", orderId: state.orders[0]!._id })
  expect(state.orders[0]?.guestAccessDigest).toBe("guest-a")
  const before = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      checkoutKey: "too-many",
      tickets: [{ tierKey: "a", quantity: 4, participantNames: ["A", "B", "C", "D"], activationCode: codes[1]! }],
    }),
  ).toMatchObject({ success: false, errorMessage: expect.stringContaining("maximum per order of 3") })
  expect(await stateRead(h)).toEqual(before)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
      orderId: state.orders[0]!._id,
      paymentReference: h.args.paymentReference,
      billingOrderReference: "billing-a",
      stripeMode: "test",
      payment: "paid",
    }),
  ).toMatchObject({ success: true, data: { status: "paid", ticketCount: 3 } })
  expect((await stateRead(h)).histories[0]?.status).toBe("consumed")
})

test("disabled and legacy products do not require or reserve optional codes", async () => {
  const h = await harnessCreate()
  await h.t.run(async (ctx) => {
    await ctx.db.patch("catalogTicketTiers", h.tierIds[0]!, { activationCodeRequired: false })
    await ctx.db.patch("catalogTicketTiers", h.tierIds[1]!, { activationCodeRequired: undefined })
  })
  expect(
    await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      tickets: [
        { tierKey: "a", quantity: 1, participantNames: ["Ada"], activationCode: "invalid" },
        { tierKey: "b", quantity: 1, participantNames: ["Bob"] },
      ],
    }),
  ).toMatchObject({ success: true })
  const state = await stateRead(h)
  expect(state.histories).toEqual([])
  expect(state.codes.every((code) => code.status === "available")).toBe(true)
})

test("concurrent preparations of a single code have exactly one winner", async () => {
  const h = await harnessCreate()
  const results = await Promise.all(
    ["a", "b"].map((key) =>
      h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
        ...h.args,
        checkoutKey: key,
        paymentReference: key,
      }),
    ),
  )
  expect(results.filter((result) => result.success)).toHaveLength(1)
  expect(results.filter((result) => !result.success)).toHaveLength(1)
  const state = await stateRead(h)
  expect(state.orders).toHaveLength(1)
  expect(state.histories).toHaveLength(1)
  expect(state.tiers[0]?.reserved).toBe(1)
})

test("normalized idempotent replay keeps the exact reservation; altered code conflicts", async () => {
  const h = await harnessCreate()
  await orderPrepare(h)
  const before = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      tickets: [{ ...h.args.tickets[0]!, activationCode: " abc12345 " }],
    }),
  ).toMatchObject({ success: true, data: { replayed: true, orderId: before.orders[0]!._id } })
  expect(await stateRead(h)).toEqual(before)
  expect(
    await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
      ...h.args,
      tickets: [{ ...h.args.tickets[0]!, activationCode: codes[1]! }],
    }),
  ).toMatchObject({ success: false, errorMessage: expect.stringContaining("different ownership or checkout evidence") })
  expect(await stateRead(h)).toEqual(before)
})

test.each(["guest", "contact"])(
  "public %s checkout enforces scheduled opening before Billing and opens exactly at the boundary",
  async (identity) => {
    const h = await harnessCreate()
    const opensAt = Date.parse("2026-10-13T18:00:00.000Z")
    vi.setSystemTime(opensAt - 1)
    const userId = await h.t.run(async (ctx) => {
      await ctx.db.patch("catalogEvents", h.eventId, { bookingOpensAt: new Date(opensAt).toISOString() })
      return ctx.db.insert("users", { name: "Existing contact", role: "user", createdAt: now, updatedAt: now })
    })
    const authSecret = "booking-opening-contact-test-secret"
    vi.stubEnv("AUTH_SECRET", authSecret)
    const token = await testAuthSessionTokenCreate(h.t, userId, authSecret)
    const checkoutKey = "b".repeat(32)
    const billing = vi.spyOn(billingEventorenClient, "ticketCheckoutCreate").mockResolvedValue({
      success: true,
      data: {
        paymentReference: `payment_${checkoutKey}`,
        orderReference: "billing-scheduled-opening",
        stripeMode: "test",
        status: "checkout_created",
        url: "https://billing.example.com/pay",
      },
    })
    const args = {
      checkoutKey,
      ...(identity === "contact" ? { token } : { guestAccessToken: "g".repeat(32) }),
      eventKey: h.args.eventKey,
      catalogVersion: 1,
      eventRevision: 1,
      successUrl: h.args.successUrl,
      cancelUrl: h.args.cancelUrl,
      legalContext: h.args.legalContext,
      tickets: h.args.tickets,
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
    }
    const rejected = await h.t.action(api.ticketing.ticketCheckoutCreateAction, args)
    expect(rejected).toMatchObject({ success: false, errorMessage: "Booking for this event is not open yet" })
    expect(billing).not.toHaveBeenCalled()
    const blocked = await stateRead(h)
    expect(blocked.orders).toEqual([])
    expect(blocked.reservations).toEqual([])
    expect(blocked.codes.every((code) => code.status === "available")).toBe(true)

    vi.setSystemTime(opensAt)
    const allowed = await h.t.action(api.ticketing.ticketCheckoutCreateAction, args)
    expect(allowed).toMatchObject({ success: true, data: { status: "checkout_created" } })
    expect(billing).toHaveBeenCalledTimes(1)
  },
)

test("public checkout accepts and normalizes optional code evidence without forwarding codes to Billing", async () => {
  const h = await harnessCreate()
  const checkoutKey = "a".repeat(32)
  const billing = vi.spyOn(billingEventorenClient, "ticketCheckoutCreate").mockResolvedValue({
    success: true,
    data: {
      paymentReference: `payment_${checkoutKey}`,
      orderReference: "billing-action",
      stripeMode: "test",
      status: "checkout_created",
      url: "https://billing.example.com/pay",
    },
  })
  expect(
    await h.t.action(api.ticketing.ticketCheckoutCreateAction, {
      checkoutKey,
      guestAccessToken: "g".repeat(32),
      eventKey: h.args.eventKey,
      catalogVersion: 1,
      eventRevision: 1,
      successUrl: h.args.successUrl,
      cancelUrl: h.args.cancelUrl,
      legalContext: h.args.legalContext,
      tickets: [{ ...h.args.tickets[0]!, activationCode: " abc12345 " }],
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
    }),
  ).toMatchObject({ success: true, data: { status: "checkout_created" } })
  const state = await stateRead(h)
  expect(JSON.parse(state.orders[0]!.checkoutContextJson).tickets[0].activationCode).toBe("ABC12345")
  expect(billing.mock.calls[0]?.[1].tickets).toEqual([{ tierKey: "a", quantity: 1 }])
  expect(state.histories[0]?.orderId).toBe(state.orders[0]?._id)
  expect(state.orders[0]?.guestAccessDigest).toBeDefined()
})

test.each(["pending", "provider error", "config error", "active lease"])(
  "expiration leaves the code reserved on %s",
  async (kind) => {
    const h = await harnessCreate()
    const correlation = await orderPrepare(h)
    if (kind === "active lease")
      await h.t.run((ctx) =>
        ctx.db.patch("ticketOrders", correlation.orderId, { checkoutAttemptLeaseUntil: Date.now() + 60_000 }),
      )
    if (kind === "config error") vi.stubEnv("EVENTOREN_BILLING_BASE_URL", "")
    const expire = vi.spyOn(billingEventorenClient, "ticketCheckoutExpire")
    if (kind === "provider error")
      expire.mockResolvedValue({ success: false, op: "test", errorMessage: "Unknown status" })
    else
      expire.mockResolvedValue({
        success: true,
        data: {
          kind: "status",
          data: {
            paymentReference: correlation.paymentReference,
            orderReference: correlation.billingOrderReference,
            stripeMode: "test",
            payment: "pending",
          },
        },
      })
    await h.t.action(internal.ticketing.ticketReservationExpireAction, { orderId: correlation.orderId })
    const state = await stateRead(h)
    expect(state.codes[0]).toMatchObject({ status: "reserved", orderId: correlation.orderId })
    expect(state.histories[0]?.status).toBe("reserved")
    expect(state.reservations[0]?.status).toBe("active")
    expect(state.tiers[0]?.reserved).toBe(1)
    if (kind === "active lease" || kind === "config error") expect(expire).not.toHaveBeenCalled()
  },
)

test.each(["failed", "expired", "not_found"])(
  "authoritative %s releases the code, retaining guest/order history",
  async (payment) => {
    const h = await harnessCreate()
    const correlation = await orderPrepare(h)
    const expire = vi.spyOn(billingEventorenClient, "ticketCheckoutExpire")
    if (payment === "not_found") expire.mockResolvedValue({ success: true, data: { kind: "not_found" } })
    else
      expire.mockResolvedValue({
        success: true,
        data: {
          kind: "status",
          data: {
            paymentReference: correlation.paymentReference,
            orderReference: correlation.billingOrderReference,
            stripeMode: "test",
            payment,
          },
        },
      })
    expect(
      await h.t.action(internal.ticketing.ticketReservationExpireAction, { orderId: correlation.orderId }),
    ).toMatchObject({ success: true })
    const state = await stateRead(h)
    expect(state.codes[0]?.status).toBe("available")
    expect(state.codes[0]?.orderId).toBeUndefined()
    expect(state.histories[0]).toMatchObject({ status: "released", orderId: correlation.orderId })
    expect(state.orders[0]?.guestAccessDigest).toBe("guest-a")
    expect(state.tiers[0]?.reserved).toBe(0)
    await h.t.action(internal.ticketing.ticketReservationExpireAction, { orderId: correlation.orderId })
    expect(await stateRead(h)).toEqual(state)
  },
)

test.each(["paid", "paid_inventory_conflict"])(
  "%s permanently consumes the code and later failed/refund-like events never release it",
  async (status) => {
    const h = await harnessCreate()
    const correlation = await orderPrepare(h)
    // Disabling the product after checkout cannot remove its original code requirement.
    await h.t.run((ctx) =>
      ctx.db.patch("catalogTicketTiers", h.tierIds[0]!, {
        activationCodeRequired: false,
        ...(status === "paid_inventory_conflict" ? { sold: 50 } : {}),
      }),
    )
    expect(
      await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...correlation, payment: "paid" }),
    ).toMatchObject({ success: true, data: { status, ticketCount: status === "paid" ? 1 : 0 } })
    const state = await stateRead(h)
    expect(state.codes[0]).toMatchObject({
      status: "consumed",
      orderId: correlation.orderId,
      consumedAt: expect.any(String),
    })
    expect(state.histories[0]?.status).toBe("consumed")
    for (const payment of ["paid", "failed", "pending"] as const)
      expect(
        await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...correlation, payment }),
      ).toMatchObject({ success: true, data: { status, paymentStatus: "paid" } })
    expect(
      await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
        orderId: correlation.orderId,
        reason: "Refund",
      }),
    ).toMatchObject({ success: false })
    const final = await stateRead(h)
    expect(final.codes).toEqual(state.codes)
    expect(final.histories).toEqual(state.histories)
    expect(final.tickets).toEqual(state.tickets)
  },
)

test.each(["paid", "failed", "expired", "release"])(
  "late paid A does not steal active B; B %s never permits reuse and only B can fulfill",
  async (outcome) => {
    const h = await harnessCreate()
    const a = await orderPrepare(h)
    expect(
      await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
        orderId: a.orderId,
        reason: "Authoritative not found",
      }),
    ).toMatchObject({ success: true })
    const b = await orderPrepare(h, "b")
    const before = await stateRead(h)
    const held = before.codes[0]!
    expect(
      await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
    ).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", ticketCount: 0 } })
    const charged = await stateRead(h)
    expect(charged.codes[0]).toMatchObject({
      status: "reserved",
      orderId: b.orderId,
      reservedAt: held.reservedAt,
      consumedAt: expect.any(String),
    })
    expect(charged.reservations).toEqual(before.reservations)
    expect(charged.histories.find((history) => history.orderId === a.orderId)?.status).toBe("consumed")
    expect(charged.histories.find((history) => history.orderId === b.orderId)?.status).toBe("reserved")
    expect(
      await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
    ).toMatchObject({ success: true, data: { ticketCount: 0 } })
    if (outcome === "release")
      await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
        orderId: b.orderId,
        reason: "Not found",
      })
    else if (outcome === "expired")
      await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, { ...b, reason: "Confirmed expired" })
    else
      expect(
        await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...b, payment: outcome }),
      ).toMatchObject({ success: true, data: { ticketCount: outcome === "paid" ? 1 : 0 } })
    const final = await stateRead(h)
    expect(final.codes[0]?.status).toBe("consumed")
    expect(final.tickets).toHaveLength(outcome === "paid" ? 1 : 0)
    if (outcome === "paid") expect(final.tickets[0]?.orderId).toBe(b.orderId)
    expect(final.histories.find((history) => history.orderId === a.orderId)?.status).toBe("consumed")
    expect(
      await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
    ).toMatchObject({ success: true, data: { ticketCount: 0 } })
    if (outcome !== "paid") {
      expect(
        await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...b, payment: "paid" }),
      ).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", ticketCount: 0 } })
      expect((await stateRead(h)).tickets).toHaveLength(0)
    }
    expect(
      await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
        ...h.args,
        checkoutKey: "c",
        paymentReference: "c",
      }),
    ).toMatchObject({ success: false })
  },
)

test("late payment consumes an available code permanently without issuing tickets", async () => {
  const h = await harnessCreate()
  const a = await orderPrepare(h)
  await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, { orderId: a.orderId, reason: "Not found" })
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", ticketCount: 0 } })
  const state = await stateRead(h)
  expect(state.codes[0]).toMatchObject({ status: "consumed", orderId: a.orderId })
  expect(state.histories[0]?.status).toBe("consumed")
})

test("late A payment after B fulfilled preserves B's consumed ownership and issues no second fulfillment", async () => {
  const h = await harnessCreate()
  const a = await orderPrepare(h)
  await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, { orderId: a.orderId, reason: "Not found" })
  const b = await orderPrepare(h, "b")
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...b, payment: "paid" }),
  ).toMatchObject({ success: true, data: { ticketCount: 1 } })
  const before = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", ticketCount: 0 } })
  const after = await stateRead(h)
  expect(after.codes).toEqual(before.codes)
  expect(after.tickets).toEqual(before.tickets)
  expect(after.histories.every((history) => history.status === "consumed")).toBe(true)
})

test.each(["code", "inventory"])(
  "checkout preflights the second product's invalid %s before claiming the first code",
  async (kind) => {
    const h = await harnessCreate()
    if (kind === "inventory")
      await h.t.run((ctx) => ctx.db.patch("catalogTicketTiers", h.tierIds[1]!, { reserved: -1 }))
    const before = await stateRead(h)
    expect(
      await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
        ...h.args,
        tickets: [
          ...h.args.tickets,
          {
            tierKey: "b",
            quantity: 1,
            participantNames: ["Bob"],
            activationCode: kind === "code" ? codes[1]! : codes[2]!,
          },
        ],
      }),
    ).toMatchObject({ success: false })
    expect(await stateRead(h)).toEqual(before)
  },
)

test.each(["missing history", "missing code", "missing owner", "wrong owner", "inventory"])(
  "%s corruption is preflighted before any code, history, inventory or lifecycle writes",
  async (kind) => {
    const h = await harnessCreate()
    h.args.tickets.push({ tierKey: "b", quantity: 1, participantNames: ["Bob"], activationCode: codes[2]! })
    const a = await orderPrepare(h)
    await h.t.run(async (ctx) => {
      if (kind === "inventory") await ctx.db.patch("catalogTicketTiers", h.tierIds[1]!, { reserved: 0 })
      if (kind === "missing code") await ctx.db.delete("ticketActivationCodes", h.codeIds[2]!)
      if (kind === "missing owner") await ctx.db.patch("ticketActivationCodes", h.codeIds[2]!, { orderId: undefined })
      if (kind === "wrong owner")
        await ctx.db.patch("ticketActivationCodes", h.codeIds[2]!, { status: "available", orderId: undefined })
      if (kind === "missing history") {
        const history = await ctx.db
          .query("ticketActivationCodeReservations")
          .withIndex("orderId", (q) => q.eq("orderId", a.orderId))
          .filter((q) => q.eq(q.field("codeId"), h.codeIds[2]!))
          .first()
        await ctx.db.delete("ticketActivationCodeReservations", history!._id)
        await ctx.db.patch("catalogTicketTiers", h.tierIds[1]!, { activationCodeRequired: false })
      }
    })
    const before = await stateRead(h)
    for (const payment of ["paid", "failed"] as const) {
      expect(await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment })).toMatchObject({
        success: false,
      })
      expect(await stateRead(h)).toEqual(before)
    }
    expect(
      await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, { ...a, reason: "Expired" }),
    ).toMatchObject({ success: false })
    expect(
      await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
        orderId: a.orderId,
        reason: "Not found",
      }),
    ).toMatchObject({ success: false })
    expect(await stateRead(h)).toEqual(before)
  },
)

test("late paid A with corrupt B ownership cannot change either order or issue tickets", async () => {
  const h = await harnessCreate()
  const a = await orderPrepare(h)
  await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, { orderId: a.orderId, reason: "Not found" })
  const b = await orderPrepare(h, "b")
  await h.t.run((ctx) => ctx.db.delete("ticketOrders", b.orderId))
  const before = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: false })
  expect(await stateRead(h)).toEqual(before)
})

test.each(["charged A history", "active B history", "charged A line", "B line"])(
  "missing %s after the late-payment race blocks B fulfillment/release without partial writes",
  async (kind) => {
    const h = await harnessCreate()
    const a = await orderPrepare(h)
    await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, { orderId: a.orderId, reason: "Not found" })
    const b = await orderPrepare(h, "b")
    expect(
      await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
    ).toMatchObject({ success: true })
    await h.t.run(async (ctx) => {
      if (kind === "B line" || kind === "charged A line") {
        const line = await ctx.db
          .query("ticketOrderLines")
          .withIndex("orderId", (q) => q.eq("orderId", kind === "B line" ? b.orderId : a.orderId))
          .first()
        await ctx.db.delete("ticketOrderLines", line!._id)
        return
      }
      const history = await ctx.db
        .query("ticketActivationCodeReservations")
        .withIndex("orderId", (q) => q.eq("orderId", kind === "charged A history" ? a.orderId : b.orderId))
        .first()
      await ctx.db.delete("ticketActivationCodeReservations", history!._id)
    })
    const before = await stateRead(h)
    for (const payment of ["paid", "failed"] as const) {
      expect(await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...b, payment })).toMatchObject({
        success: false,
      })
      expect(await stateRead(h)).toEqual(before)
    }
  },
)

test("digest and issued-code failures occur before activation-code consumption", async () => {
  const h = await harnessCreate()
  h.args.tickets[0]!.quantity = 2
  h.args.tickets[0]!.participantNames = ["Ada", "Bob"]
  const a = await orderPrepare(h)
  const before = await stateRead(h)
  const digest = vi.spyOn(crypto.subtle, "digest").mockRejectedValue(new Error("Unavailable"))
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: false })
  expect(await stateRead(h)).toEqual(before)
  digest.mockRestore()
  const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000000")
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...a, payment: "paid" }),
  ).toMatchObject({ success: false })
  expect(await stateRead(h)).toEqual(before)
  uuid.mockRestore()
})
