/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
import { ticketActivationCodeLifecyclePlan } from "../src/ticketing/convex/ticketActivationCodeLifecyclePlan.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-13T10:00:00.000Z"
const outcome = {
  cancelledAt: now,
  organizationId: "org-eventoren",
  eventKey: "cancellation",
  orderReference: "billing-order",
  paymentReference: "payment_cancel",
  stripeMode: "test" as const,
  paymentMethodType: "sepa_debit" as const,
  stripeEventId: "evt_failed",
  stripeSessionId: "cs_test_session",
  stripePaymentIntentId: "pi_cancel",
  reason: "payment_failed" as const,
  stripeEventType: "checkout.session.async_payment_failed" as const,
  stripeChargeId: null,
  stripeDisputeId: null,
}
const dispute = {
  ...outcome,
  stripeEventId: "evt_disputed",
  reason: "sepa_disputed" as const,
  stripeEventType: "charge.dispute.created" as const,
  stripeChargeId: "ch_cancel",
  stripeDisputeId: "dp_cancel",
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("EVENTOREN_BILLING_ORGANIZATION_ID", "org-eventoren")
  vi.stubEnv("EVENTOREN_BILLING_STRIPE_MODE", "test")
  vi.stubEnv("EVENTOREN_PAYMENT_OUTCOME_BEARER_TOKEN", "inbound-only-secret")
  vi.stubEnv("EVENTOREN_BILLING_API_KEY", "outbound-must-not-authorize")
  vi.stubEnv("EVENTOREN_SEPA_EARLY_TICKET_ISSUANCE_ENABLED", "true")
  vi.stubEnv("AUTH_SECRET", "cancellation-check-in-secret")
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function fixtureCreate() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Operator",
      role: "organizer",
      organizerInvitedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey: "cancellation",
      title: "Cancellation",
      subtitle: "",
      description: "",
      category: "konzerte",
      startsAt: now,
      endsAt: "2099-10-13T10:00:00.000Z",
      doorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Eventoren",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      catalogVersion: 1,
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
      capacity: 10,
      reserved: 2,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "cancel-checkout",
      customerEmail: "buyer@example.com",
      contactSnapshotJson: "{}",
      eventKey: "cancellation",
      eventTitle: "Cancellation",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: "2099-10-13T10:00:00.000Z",
      eventDoorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Eventoren",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 200,
      feeCents: 20,
      totalCents: 220,
      checkoutContextJson: "{}",
      paymentReference: outcome.paymentReference,
      stripeMode: "test",
      billingOrderReference: outcome.orderReference,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_session#opaque",
      status: "checkout_created",
      paymentStatus: "pending",
      fulfillmentEligible: true,
      reservationExpiresAt: Date.now() + 100000,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: outcome.paymentReference,
      stripeMode: "test",
      billingOrderReference: outcome.orderReference,
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_session#opaque",
      status: "checkout_created",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId,
      eventKey: "cancellation",
      tierKey: "standard",
      tierName: "Standard",
      tierDescription: "",
      quantity: 2,
      priceCents: 100,
      feeCents: 10,
      createdAt: now,
    })
    await ctx.db.insert("ticketReservations", {
      orderId,
      tierId,
      quantity: 2,
      status: "active",
      expiresAt: Date.now() + 100000,
      createdAt: now,
    })
    return { orderId, tierId, userId }
  })
  const correlation = {
    orderId: ids.orderId,
    paymentReference: outcome.paymentReference,
    billingOrderReference: outcome.orderReference,
    stripeMode: "test" as const,
  }
  const apply = (payment: "pending" | "paid" | "failed", evidence = {}) =>
    t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
      ...correlation,
      payment,
      ...evidence,
    })
  const processing = () =>
    apply("pending", {
      checkoutCompletedAt: now,
      paymentMethodType: "sepa_debit",
      stripePaymentIntentStatus: "processing",
    })
  const cancel = (cancellation = outcome) =>
    t.mutation(internal.ticketing.ticketPaymentCancellationMutation, { cancellation })
  const read = () =>
    t.run(async (ctx) => ({
      order: await ctx.db.get("ticketOrders", ids.orderId),
      tier: await ctx.db.get("catalogTicketTiers", ids.tierId),
      tickets: await ctx.db
        .query("ticketIssued")
        .withIndex("orderIdAndSequence", (q) => q.eq("orderId", ids.orderId))
        .collect(),
      reservations: await ctx.db
        .query("ticketReservations")
        .withIndex("orderId", (q) => q.eq("orderId", ids.orderId))
        .collect(),
      work: await ctx.db
        .query("ticketFulfillmentWork")
        .withIndex("orderId", (q) => q.eq("orderId", ids.orderId))
        .collect(),
      history: await ctx.db
        .query("ticketCheckInHistory")
        .withIndex("eventKeyAndOccurredAt", (q) => q.eq("eventKey", "cancellation"))
        .collect(),
    }))
  const post = (body: unknown, token = "inbound-only-secret") =>
    t.fetch("/eventoren/payment-outcomes", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  return { t, ...ids, correlation, apply, processing, cancel, read, post }
}

test("authenticated failure before reconciliation binds unknown PI and releases reservations once; later success cannot issue", async () => {
  const h = await fixtureCreate()
  expect((await h.read()).order?.stripePaymentIntentId).toBeUndefined()
  expect((await h.post(outcome)).status).toBe(200)
  const first = await h.read()
  expect(first.order).toMatchObject({
    cancellation: outcome,
    stripePaymentIntentId: "pi_cancel",
    stripeSessionId: "cs_test_session",
    paymentStatus: "failed",
  })
  expect(first.tier).toMatchObject({ reserved: 0, sold: 0 })
  expect(first.reservations[0]?.status).toBe("released")
  expect((await h.post(outcome)).status).toBe(200) // Lost response/redelivery.
  expect(await h.read()).toEqual(first)
  await h.processing()
  await h.apply("paid", { bookingNumber: 123, bookingReference: "late-settlement" })
  const settled = await h.read()
  expect(settled.order).toMatchObject({ paymentStatus: "paid", cancellation: outcome, bookingNumber: 123 })
  expect(settled.tickets).toHaveLength(0)
  expect(settled.work).toHaveLength(0)
  expect(settled.tier).toEqual(first.tier)
})

test("failure cancels every processing-SEPA ticket without restocking sold inventory or duplicating tickets on delayed success", async () => {
  const h = await fixtureCreate()
  await h.processing()
  const issued = await h.read()
  expect(issued.tickets).toHaveLength(2)
  expect(await h.cancel()).toMatchObject({ success: true })
  await h.processing()
  await h.apply("paid")
  const cancelled = await h.read()
  expect(cancelled.tickets).toEqual(issued.tickets.map((ticket) => ({ ...ticket, cancelled: true })))
  expect(cancelled.tier).toEqual(issued.tier)
  expect(cancelled.reservations).toEqual(issued.reservations)
  expect(cancelled.order?.ticketsIssuedAt).toBe(issued.order?.ticketsIssuedAt)
  expect(cancelled.work).toHaveLength(0)
})

test("status recovery cancels a paid checked-in ticket and stops pending work, preserving paid truth and admission history", async () => {
  const h = await fixtureCreate()
  await h.apply("paid", { paymentMethodType: "sepa_debit" })
  // This deliberately minimal order has no legal delivery snapshot. Seed existing
  // in-flight work to exercise cancellation independently of delivery integration.
  await h.t.run((ctx) =>
    ctx.db.insert("ticketFulfillmentWork", {
      orderId: h.orderId,
      paymentReference: outcome.paymentReference,
      billingOrderReference: outcome.orderReference,
      stripeMode: "test",
      requestSnapshotJson: "{}",
      status: "preparing",
      attemptCount: 1,
      nextAttemptAt: Date.now(),
      leaseUntil: Date.now() + 120000,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const ticket = (await h.read()).tickets[0]!
  const token = await createToken(h.userId, "cancellation-check-in-secret")
  await h.t.run((ctx) =>
    ctx.db.insert("authSessions", {
      userId: h.userId,
      token,
      loginMethod: "email",
      expiresAt: "2099-10-13T10:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    }),
  )
  expect(
    await h.t.mutation(api.organizer.organizerTicketCheckInMutation, {
      token,
      eventKey: "cancellation",
      ticketCode: ticket.code,
    }),
  ).toMatchObject({ success: true })
  const before = await h.read()
  expect(await h.apply("paid", { cancellation: dispute })).toMatchObject({ success: true })
  const cancelled = await h.read()
  expect(cancelled.order).toMatchObject({ paymentStatus: "paid", cancellation: dispute })
  expect(cancelled.history).toEqual(before.history)
  expect(cancelled.tickets[0]).toMatchObject({
    _id: ticket._id,
    checkedInAt: before.tickets[0]?.checkedInAt,
    cancelled: true,
  })
  expect(cancelled.tier).toEqual(before.tier)
  expect(
    await h.t.mutation(api.organizer.organizerTicketCheckInMutation, {
      token,
      eventKey: "cancellation",
      ticketCode: ticket.code,
    }),
  ).toMatchObject({ success: false, code: "organizer.check-in.cancelled" })
  const work = cancelled.work[0]!
  expect(work.cancelledAt).toBeDefined()
  expect(await h.t.mutation(internal.ticketing.ticketFulfillmentWorkClaimMutation, { workId: work._id })).toMatchObject(
    { success: true, data: { claimed: false } },
  )
  await h.t.mutation(internal.ticketing.ticketFulfillmentWorkRetryMutation, {
    workId: work._id,
    errorMessage: "stale worker",
  })
  expect(
    await h.t.mutation(internal.ticketing.ticketFulfillmentWorkPreparedMutation, {
      workId: work._id,
      fulfillmentReference: "stale",
    }),
  ).toMatchObject({ success: false })
  await h.apply("paid")
  expect((await h.read()).work).toEqual(cancelled.work)
  expect((await h.read()).history).toEqual(before.history)
})

test.each([
  "organizationId",
  "eventKey",
  "orderReference",
  "paymentReference",
  "stripeMode",
  "stripeSessionId",
  "stripePaymentIntentId",
] as const)("receiver rejects mismatched %s even after a successful cancellation without writes", async (field) => {
  const h = await fixtureCreate()
  await h.t.run((ctx) => ctx.db.patch("ticketOrders", h.orderId, { stripePaymentIntentId: "pi_cancel" }))
  await h.cancel()
  const before = await h.read()
  const wrong = {
    ...outcome,
    [field]:
      field === "stripeMode"
        ? "live"
        : field === "stripePaymentIntentId"
          ? "pi_foreign"
          : field === "stripeSessionId"
            ? "cs_test_foreign"
            : field === "paymentReference"
              ? "payment_foreign"
              : "foreign",
  }
  expect((await h.post(wrong)).status).toBe(409)
  expect(await h.read()).toEqual(before)
})

test("first adverse event remains stable; exact event redelivery rejects altered time/reason/evidence", async () => {
  const h = await fixtureCreate()
  await h.cancel()
  const before = await h.read()
  for (const change of [
    { cancelledAt: "2026-10-14T10:00:00.000Z" },
    { stripeChargeId: "ch_changed" },
    { ...dispute, stripeEventId: outcome.stripeEventId },
  ])
    expect((await h.post({ ...outcome, ...change })).status).toBe(409)
  expect((await h.post(dispute)).status).toBe(200)
  expect(await h.read()).toEqual(before)
})

test("authentication uses only dedicated token and strict direct body rejects envelopes, unknown fields, non-SEPA and invalid IDs", async () => {
  const h = await fixtureCreate()
  const before = await h.read()
  for (const token of ["", "wrong", "outbound-must-not-authorize", "inbound-only-secreu"])
    expect((await h.post(outcome, token)).status).toBe(401)
  for (const body of [
    { cancellation: outcome },
    { ...outcome, extra: true },
    { ...outcome, paymentMethodType: "card" },
    { ...outcome, stripeEventId: "invalid" },
    { ...outcome, stripeDisputeId: "dp_unexpected" },
  ])
    expect((await h.post(body)).status).toBe(400)
  expect((await h.post({ ...outcome, organizationId: " org-eventoren " })).status).toBe(409)
  expect(
    (await h.t.fetch("/eventoren/payment-outcomes", { method: "POST", body: JSON.stringify(outcome) })).status,
  ).toBe(401)
  expect(
    (
      await h.t.fetch("/eventoren/payment-outcomes", {
        method: "POST",
        headers: { authorization: "Bearer inbound-only-secret" },
        body: "{",
      })
    ).status,
  ).toBe(400)
  vi.stubEnv("EVENTOREN_PAYMENT_OUTCOME_BEARER_TOKEN", "")
  expect((await h.post(outcome)).status).toBe(503)
  expect(await h.read()).toEqual(before)
})

test("a Stripe cancellation event already bound to one order cannot cancel another correctly correlated order", async () => {
  const h = await fixtureCreate()
  expect(await h.cancel()).toMatchObject({ success: true })
  const otherId = await h.t.run(async (ctx) => {
    const original = (await ctx.db.get("ticketOrders", h.orderId))!
    const { _id, _creationTime, cancellation, stripeSessionId, stripePaymentIntentId, ...fields } = original
    const orderId = await ctx.db.insert("ticketOrders", {
      ...fields,
      checkoutKey: "other-checkout",
      paymentReference: "payment_other",
      billingOrderReference: "billing-other",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_other",
      status: "checkout_created",
      paymentStatus: "pending",
    })
    await ctx.db.insert("ticketPaymentAttempts", {
      orderId,
      paymentReference: "payment_other",
      billingOrderReference: "billing-other",
      stripeMode: "test",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_other",
      status: "checkout_created",
      createdAt: now,
      updatedAt: now,
    })
    return orderId
  })
  const before = await h.t.run((ctx) => ctx.db.get("ticketOrders", otherId))
  expect(
    (
      await h.post({
        ...outcome,
        paymentReference: "payment_other",
        orderReference: "billing-other",
        stripeSessionId: "cs_test_other",
        stripePaymentIntentId: "pi_other",
      })
    ).status,
  ).toBe(409)
  expect(await h.t.run((ctx) => ctx.db.get("ticketOrders", otherId))).toEqual(before)
})

test("reservation corruption is preflighted before any cancellation, ticket or PI writes", async () => {
  const h = await fixtureCreate()
  await h.t.run((ctx) => ctx.db.patch("catalogTicketTiers", h.tierId, { reserved: 1 }))
  const before = await h.read()
  expect(await h.cancel()).toMatchObject({ success: false })
  expect(await h.read()).toEqual(before)
})

test("callback does not bind a PI without an existing stored session and rejects conflicting attempt evidence", async () => {
  for (const kind of ["missing session", "wrong attempt session", "wrong attempt order"] as const) {
    const h = await fixtureCreate()
    await h.t.run(async (ctx) => {
      if (kind === "missing session") {
        await ctx.db.patch("ticketOrders", h.orderId, { checkoutUrl: undefined })
        return
      }
      const attempt = await ctx.db
        .query("ticketPaymentAttempts")
        .withIndex("paymentReference", (q) => q.eq("paymentReference", outcome.paymentReference))
        .unique()
      await ctx.db.patch(
        "ticketPaymentAttempts",
        attempt!._id,
        kind === "wrong attempt session"
          ? { checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_other" }
          : { billingOrderReference: "other-order" },
      )
    })
    const before = await h.read()
    expect((await h.post(outcome)).status).toBe(409)
    expect(await h.read()).toEqual(before)
  }
})

test("processing ticket cancellation releases only a remaining unissued reservation and reports cancelled admission before unpaid", async () => {
  const h = await fixtureCreate()
  await h.processing()
  await h.t.run(async (ctx) => {
    await ctx.db.patch("catalogTicketTiers", h.tierId, { reserved: 1 })
    await ctx.db.insert("ticketReservations", {
      orderId: h.orderId,
      tierId: h.tierId,
      quantity: 1,
      status: "active",
      expiresAt: Date.now() + 1000,
      createdAt: now,
    })
  })
  expect(await h.cancel()).toMatchObject({ success: true })
  const state = await h.read()
  expect(state.tier).toMatchObject({ reserved: 0, sold: 2 })
  expect(state.reservations.map((r) => r.status)).toEqual(["consumed", "released"])
  const token = await createToken(h.userId, "cancellation-check-in-secret")
  await h.t.run((ctx) =>
    ctx.db.insert("authSessions", {
      userId: h.userId,
      token,
      loginMethod: "email",
      expiresAt: "2099-10-13T10:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    }),
  )
  expect(
    await h.t.mutation(api.organizer.organizerTicketCheckInMutation, {
      token,
      eventKey: "cancellation",
      ticketCode: state.tickets[0]!.code,
    }),
  ).toMatchObject({ success: false, code: "organizer.check-in.cancelled" })
  expect((await h.read()).history).toHaveLength(0)
})

test("dispute redelivery refuses conflicting charge/dispute evidence even with a different event ID", async () => {
  const h = await fixtureCreate()
  expect((await h.post(dispute)).status).toBe(200)
  const before = await h.read()
  for (const change of [{ stripeChargeId: "ch_foreign" }, { stripeDisputeId: "dp_foreign" }])
    expect((await h.post({ ...dispute, stripeEventId: "evt_other", ...change })).status).toBe(409)
  expect(await h.read()).toEqual(before)
})

test("cancelled processing order preserves consumed activation-code scars and their ownership validation", async () => {
  const h = await fixtureCreate()
  const codeId = await h.t.run(async (ctx) => {
    const tier = await ctx.db.get("catalogTicketTiers", h.tierId)
    const line = await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", h.orderId))
      .unique()
    const codeId = await ctx.db.insert("ticketActivationCodes", {
      eventId: tier!.eventId,
      tierId: h.tierId,
      eventKey: "cancellation",
      tierKey: "standard",
      code: "CANCEL12",
      number: 1,
      status: "reserved",
      orderId: h.orderId,
      reservedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketActivationCodeReservations", {
      codeId,
      orderId: h.orderId,
      tierId: h.tierId,
      eventId: tier!.eventId,
      eventKey: "cancellation",
      tierKey: "standard",
      status: "reserved",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.patch("ticketOrderLines", line!._id, { activationCodeId: codeId })
    return codeId
  })
  expect(await h.processing()).toMatchObject({ success: true })
  const consumed = await h.t.run((ctx) => ctx.db.get("ticketActivationCodes", codeId))
  expect(consumed?.status).toBe("consumed")
  expect(await h.cancel()).toMatchObject({ success: true })
  expect(await h.t.run((ctx) => ctx.db.get("ticketActivationCodes", codeId))).toEqual(consumed)
  expect(
    await h.t.run(async (ctx) =>
      ticketActivationCodeLifecyclePlan(ctx, (await ctx.db.get("ticketOrders", h.orderId))!, "release"),
    ),
  ).toMatchObject({ success: true, data: { changes: [] } })
})
