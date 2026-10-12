/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.js"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.js"

// Tiers seeded without a stored maxPerOrder fall back to the legacy default of 10 per product.
const ticketMaxPerOrder = 10

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-02T00:00:00.000Z"
type Harness = Awaited<ReturnType<typeof checkoutCreate>>

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function checkoutCreate(quantities = Array.from({ length: ticketMaxPerOrder }, () => 1)) {
  const t = convexTest(schema, modules)
  const eventId = await t.run(async (ctx) => {
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
      eventKey: "lifecycle",
      title: "Lifecycle",
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
    for (let index = 0; index < quantities.length; index += 1)
      await ctx.db.insert("catalogTicketTiers", {
        eventId,
        tierKey: `tier-${index.toString().padStart(2, "0")}`,
        name: `Tier ${index}`,
        description: "",
        priceCents: 100,
        feeCents: 10,
        capacity: 100,
        reserved: 0,
        sold: 0,
        sortOrder: index,
        catalogVersion: 1,
        createdAt: now,
        updatedAt: now,
      })
    return eventId
  })
  const args = {
    checkoutKey: "lifecycle-checkout",
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    customerAddress: "Street",
    customerPhone: "",
    eventKey: "lifecycle",
    catalogVersion: 1,
    eventRevision: 1,
    stripeMode: "test" as const,
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    locale: "de" as const,
    paymentReference: "lifecycle-payment",
    fulfillmentEligible: true,
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
    tickets: quantities.map((quantity, index) => ({
      tierKey: `tier-${index.toString().padStart(2, "0")}`,
      quantity,
      participantNames: Array.from({ length: quantity }, (_, participant) => `Participant ${index}-${participant}`),
    })),
  }
  const result = await t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, args)
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("Checkout preparation failed")
  const correlation = {
    orderId: result.data.orderId,
    paymentReference: args.paymentReference,
    billingOrderReference: "billing-lifecycle",
    stripeMode: "test" as const,
  }
  return { t, eventId, correlation, args }
}

async function stateRead({ t, correlation, eventId }: Harness) {
  return await t.run(async (ctx) => ({
    order: await ctx.db.get("ticketOrders", correlation.orderId),
    attempt: await ctx.db
      .query("ticketPaymentAttempts")
      .withIndex("paymentReference", (q) => q.eq("paymentReference", correlation.paymentReference))
      .unique(),
    tiers: await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", eventId))
      .collect(),
    reservations: await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", correlation.orderId))
      .collect(),
    tickets: await ctx.db
      .query("ticketIssued")
      .withIndex("orderIdAndSequence", (q) => q.eq("orderId", correlation.orderId))
      .collect(),
    deliveries: await ctx.db
      .query("ticketOrderDeliveries")
      .withIndex("orderId", (q) => q.eq("orderId", correlation.orderId))
      .collect(),
    work: await ctx.db
      .query("ticketFulfillmentWork")
      .withIndex("orderId", (q) => q.eq("orderId", correlation.orderId))
      .collect(),
  }))
}

async function distractorsInsert({ t, correlation }: Harness) {
  return await t.run(async (ctx) => {
    const order = await ctx.db.get("ticketOrders", correlation.orderId)
    if (!order) throw new Error("Missing order")
    const { _id: orderId, _creationTime: orderCreationTime, ...orderFields } = order
    const lines = await ctx.db
      .query("ticketOrderLines")
      .withIndex("orderId", (q) => q.eq("orderId", correlation.orderId))
      .collect()
    const reservations = await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", correlation.orderId))
      .collect()
    let firstOrderId: Id<"ticketOrders"> | undefined
    for (let index = 0; index < 120; index += 1) {
      const id = await ctx.db.insert("ticketOrders", {
        ...orderFields,
        checkoutKey: `distractor-${index}`,
        paymentReference: `distractor-payment-${index}`,
        status: "paid",
        paymentStatus: "paid",
      })
      firstOrderId ??= id
      for (const line of lines) {
        const { _id, _creationTime, ...fields } = line
        await ctx.db.insert("ticketOrderLines", { ...fields, orderId: id })
      }
      for (const reservation of reservations) {
        const { _id, _creationTime, ...fields } = reservation
        await ctx.db.insert("ticketReservations", { ...fields, orderId: id, status: "consumed" })
      }
      for (let sequence = 1; sequence <= ticketMaxPerOrder; sequence += 1)
        await ctx.db.insert("ticketIssued", {
          orderId: id,
          sequence,
          code: `DISTRACTOR-${index}-${sequence}`,
          eventKey: order.eventKey,
          eventTitle: order.eventTitle,
          eventStartsAt: order.eventStartsAt,
          eventDoorsAt: order.eventDoorsAt,
          venue: order.venue,
          city: order.city,
          address: order.address,
          tierKey: "distractor",
          tierName: "Distractor",
          priceCents: 100,
          feeCents: 10,
          issuedAt: now,
        })
    }
    return firstOrderId!
  })
}

test.each([{ quantities: Array.from({ length: ticketMaxPerOrder }, () => 1) }, { quantities: [ticketMaxPerOrder] }])(
  "maximum legitimate order issues every ticket, preserves fulfillment totals and ignores stale/duplicate events: %j",
  async ({ quantities }) => {
    const h = await checkoutCreate(quantities)
    const foreignOrderId = await distractorsInsert(h)
    const apply = (payment: "paid" | "pending" | "failed") =>
      h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...h.correlation, payment })
    expect(await apply("paid")).toMatchObject({
      success: true,
      data: { status: "paid", ticketCount: ticketMaxPerOrder },
    })
    const first = await stateRead(h)
    expect(first.tickets.map((ticket) => ticket.sequence)).toEqual(
      Array.from({ length: ticketMaxPerOrder }, (_, index) => index + 1),
    )
    expect(first.tickets.map((ticket) => ticket.participantName)).toEqual(
      quantities.flatMap((quantity, index) =>
        Array.from({ length: quantity }, (_, participant) => `Participant ${index}-${participant}`),
      ),
    )
    expect(first.tiers.reduce((sum, tier) => sum + tier.sold, 0)).toBe(ticketMaxPerOrder)
    expect(first.tiers.every((tier) => tier.reserved === 0)).toBe(true)
    expect(first.reservations.every((reservation) => reservation.status === "consumed")).toBe(true)
    expect(first.deliveries).toHaveLength(1)
    expect(first.work).toHaveLength(1)
    const snapshot = JSON.parse(first.work[0]!.requestSnapshotJson)
    expect(snapshot.tickets).toHaveLength(ticketMaxPerOrder)
    expect(snapshot.tickets.map((ticket: { admissionCode: string }) => ticket.admissionCode)).toEqual(
      first.tickets.map((ticket) => ticket.code),
    )
    for (const payment of ["paid", "pending", "failed", "paid"] as const)
      expect(await apply(payment)).toMatchObject({
        success: true,
        data: { status: "paid", paymentStatus: "paid", ticketCount: ticketMaxPerOrder },
      })
    expect(
      await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, { ...h.correlation, reason: "Expired" }),
    ).toMatchObject({ success: true, data: { paid: true, released: false, ticketCount: ticketMaxPerOrder } })
    const final = await stateRead(h)
    expect(final.tickets).toEqual(first.tickets)
    expect(final.tiers).toEqual(first.tiers)
    expect(final.work).toEqual(first.work)
    expect(final.deliveries).toEqual(first.deliveries)
    expect(final.attempt?.status).toBe("paid")
    expect(
      await h.t.run((ctx) =>
        ctx.db
          .query("ticketIssued")
          .withIndex("orderIdAndSequence", (q) => q.eq("orderId", foreignOrderId))
          .collect(),
      ),
    ).toHaveLength(ticketMaxPerOrder)
    expect(
      await h.t.mutation(internal.ticketing.ticketCheckoutPrepareMutation, {
        ...h.args,
        checkoutKey: "oversize-checkout",
        paymentReference: "oversize-payment",
        tickets: [
          {
            tierKey: "tier-00",
            quantity: ticketMaxPerOrder + 1,
            participantNames: Array.from({ length: ticketMaxPerOrder + 1 }, () => "Ada"),
          },
        ],
      }),
    ).toMatchObject({ success: false })
  },
)

test.each(["expiry", "failure", "release", "capacity conflict"] as const)(
  "%s releases all ten reservations once among large distractors and late paid truth never issues tickets",
  async (operation) => {
    const h = await checkoutCreate()
    await distractorsInsert(h)
    if (operation === "capacity conflict")
      await h.t.run(async (ctx) => {
        const tier = await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", h.eventId).eq("tierKey", "tier-09"))
          .unique()
        await ctx.db.patch("catalogTicketTiers", tier!._id, { sold: tier!.capacity })
      })
    const run = () => {
      if (operation === "expiry")
        return h.t.mutation(internal.ticketing.ticketReservationExpireMutation, { ...h.correlation, reason: "Expired" })
      if (operation === "release")
        return h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
          orderId: h.correlation.orderId,
          reason: "Rejected",
        })
      return h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
        ...h.correlation,
        payment: operation === "failure" ? "failed" : "paid",
      })
    }
    expect(await run()).toMatchObject({ success: true })
    const first = await stateRead(h)
    expect(first.reservations).toHaveLength(ticketMaxPerOrder)
    expect(first.reservations.every((reservation) => reservation.status === "released")).toBe(true)
    expect(first.tiers.every((tier) => tier.reserved === 0)).toBe(true)
    expect(await run()).toMatchObject({ success: true })
    expect((await stateRead(h)).reservations).toEqual(first.reservations)
    for (const payment of ["paid", "paid", "failed", "pending"] as const)
      expect(
        await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...h.correlation, payment }),
      ).toMatchObject({
        success: true,
        data: { status: "paid_inventory_conflict", paymentStatus: "paid", ticketCount: 0 },
      })
    const final = await stateRead(h)
    expect(final.tiers).toEqual(first.tiers)
    expect(final.reservations).toEqual(first.reservations)
    expect(final.tickets).toHaveLength(0)
    expect(final.work).toHaveLength(0)
    expect(final.attempt?.status).toBe("paid")
  },
)

test.each(["paid", "failed", "expiry", "release"] as const)(
  "%s detects corruption in the last tier before modifying any inventory or lifecycle state",
  async (operation) => {
    const h = await checkoutCreate()
    await h.t.run(async (ctx) => {
      const tier = await ctx.db
        .query("catalogTicketTiers")
        .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", h.eventId).eq("tierKey", "tier-09"))
        .unique()
      await ctx.db.patch("catalogTicketTiers", tier!._id, { reserved: 0 })
    })
    const before = await stateRead(h)
    const result =
      operation === "expiry"
        ? await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, {
            ...h.correlation,
            reason: "Expired",
          })
        : operation === "release"
          ? await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
              orderId: h.correlation.orderId,
              reason: "Rejected",
            })
          : await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
              ...h.correlation,
              payment: operation,
            })
    expect(result).toMatchObject({ success: false })
    expect(await stateRead(h)).toEqual(before)
  },
)

test.each(["lines", "reservations", "tickets", "quantity", "mismatch"] as const)(
  "rejects invalid %s rather than processing a partial order or returning a truncated count",
  async (kind) => {
    const h = await checkoutCreate()
    await h.t.run(async (ctx) => {
      if (kind === "lines" || kind === "quantity") {
        const line = await ctx.db
          .query("ticketOrderLines")
          .withIndex("orderId", (q) => q.eq("orderId", h.correlation.orderId))
          .first()
        if (kind === "quantity") {
          await ctx.db.patch("ticketOrderLines", line!._id, { quantity: 2 })
          return
        }
        const { _id, _creationTime, ...fields } = line!
        await ctx.db.insert("ticketOrderLines", fields)
        return
      }
      if (kind === "reservations" || kind === "mismatch") {
        const reservation = await ctx.db
          .query("ticketReservations")
          .withIndex("orderId", (q) => q.eq("orderId", h.correlation.orderId))
          .first()
        if (kind === "mismatch") {
          await ctx.db.patch("ticketReservations", reservation!._id, { quantity: 2 })
          return
        }
        const { _id, _creationTime, ...fields } = reservation!
        await ctx.db.insert("ticketReservations", fields)
        return
      }
      for (let sequence = 1; sequence <= ticketMaxPerOrder + 1; sequence += 1)
        await ctx.db.insert("ticketIssued", {
          orderId: h.correlation.orderId,
          sequence,
          code: `CORRUPT-${sequence}`,
          eventKey: "lifecycle",
          eventTitle: "Lifecycle",
          eventStartsAt: now,
          eventDoorsAt: now,
          venue: "Hall",
          city: "Berlin",
          address: "Street",
          tierKey: "tier-00",
          tierName: "Tier 0",
          priceCents: 100,
          feeCents: 10,
          issuedAt: now,
        })
    })
    const before = await stateRead(h)
    expect(
      await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...h.correlation, payment: "paid" }),
    ).toMatchObject({ success: false })
    expect(await stateRead(h)).toEqual(before)
    if (kind === "tickets" || kind === "reservations") {
      expect(
        await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
          ...h.correlation,
          payment: "failed",
        }),
      ).toMatchObject({ success: false })
      expect(
        await h.t.mutation(internal.ticketing.ticketReservationExpireMutation, { ...h.correlation, reason: "Expired" }),
      ).toMatchObject({ success: false })
      expect(await stateRead(h)).toEqual(before)
    }
  },
)

test("code exhaustion on the second ticket and digest failure leave the whole order retryable", async () => {
  const h = await checkoutCreate([ticketMaxPerOrder])
  const before = await stateRead(h)
  const uuid = vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000000")
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...h.correlation, payment: "paid" }),
  ).toMatchObject({ success: false, errorMessage: "Could not generate a unique ticket code" })
  expect(await stateRead(h)).toEqual(before)
  uuid.mockRestore()
  const digest = vi.spyOn(crypto.subtle, "digest").mockRejectedValue(new Error("Digest unavailable"))
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...h.correlation, payment: "paid" }),
  ).toMatchObject({ success: false })
  expect(await stateRead(h)).toEqual(before)
  digest.mockRestore()
  expect(
    await h.t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, { ...h.correlation, payment: "paid" }),
  ).toMatchObject({ success: true, data: { ticketCount: ticketMaxPerOrder } })
})

test("release preflight sums duplicate-tier reservations and keeps other buyers' inventory on a retry", async () => {
  const h = await checkoutCreate([2])
  await h.t.run(async (ctx) => {
    const reservation = await ctx.db
      .query("ticketReservations")
      .withIndex("orderId", (q) => q.eq("orderId", h.correlation.orderId))
      .first()
    const { _id, _creationTime, ...fields } = reservation!
    await ctx.db.insert("ticketReservations", fields)
    await ctx.db.patch("catalogTicketTiers", reservation!.tierId, { reserved: 3 })
  })
  const before = await stateRead(h)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
      orderId: h.correlation.orderId,
      reason: "Rejected",
    }),
  ).toMatchObject({ success: false })
  expect(await stateRead(h)).toEqual(before)
  await h.t.run(async (ctx) => ctx.db.patch("catalogTicketTiers", before.tiers[0]!._id, { reserved: 7 }))
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
      orderId: h.correlation.orderId,
      reason: "Rejected",
    }),
  ).toMatchObject({ success: true, data: { released: true } })
  const released = await stateRead(h)
  expect(released.tiers[0]?.reserved).toBe(3)
  expect(released.reservations.every((reservation) => reservation.status === "released")).toBe(true)
  expect(
    await h.t.mutation(internal.ticketing.ticketReservationReleaseMutation, {
      orderId: h.correlation.orderId,
      reason: "Retry",
    }),
  ).toMatchObject({ success: true, data: { released: false } })
  expect(await stateRead(h)).toEqual(released)
})
