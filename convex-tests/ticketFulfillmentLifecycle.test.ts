/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-13T10:00:00.000Z"

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function fixtureCreate() {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  const { orderId, workId } = await t.run(async (ctx) => {
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: "fulfillment-checkout",
      customerEmail: "buyer@example.com",
      contactSnapshotJson: "{}",
      eventKey: "fulfillment",
      eventTitle: "Fulfillment",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Eventoren",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 100,
      feeCents: 10,
      totalCents: 110,
      checkoutContextJson: JSON.stringify({ locale: "de", legalContext: { cta: "Book" } }),
      paymentReference: "fulfillment-payment",
      stripeMode: "test",
      fulfillmentEligible: true,
      legalDocumentSetRevision: "revision-1",
      legalTermsMarkdown: "Terms",
      legalPrivacyMarkdown: "Privacy",
      billingOrderReference: "billing-order",
      status: "checkout_created",
      paymentStatus: "pending",
      reservationExpiresAt: Date.now() + 60_000,
      checkoutCompletedAt: now,
      paymentMethodType: "sepa_debit",
      stripePaymentIntentStatus: "processing",
      ticketsIssuedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    const workId = await ctx.db.insert("ticketFulfillmentWork", {
      orderId,
      paymentReference: "fulfillment-payment",
      billingOrderReference: "billing-order",
      stripeMode: "test",
      deliveryMode: "tickets_only",
      requestSnapshotJson: JSON.stringify({ deliveryMode: "tickets_only", immutable: "snapshot" }),
      status: "preparing",
      attemptCount: 1,
      nextAttemptAt: 0,
      createdAt: now,
      updatedAt: now,
    })
    return { orderId, workId }
  })
  return { t, orderId, workId }
}

test("issues a usable early-SEPA access URL and reuses its immutable capability", async () => {
  const { t, orderId } = await fixtureCreate()
  const args = { orderId, publicBaseUrl: "https://eventoren.example" }
  const first = await t.mutation(internal.ticketing.ticketOrderAccessCapabilityEnsureMutation, args)
  expect(first).toMatchObject({ success: true, data: { replayed: false } })
  if (!first.success) return
  expect(first.data.accessUrl).toMatch(/^https:\/\/eventoren\.example\/checkout#ticketAccess=\w+$/u)
  const replay = await t.mutation(internal.ticketing.ticketOrderAccessCapabilityEnsureMutation, args)
  expect(replay).toEqual({ ...first, data: { ...first.data, replayed: true } })
  const capability = await t.query(internal.ticketing.ticketOrderByAccessTokenQuery, {
    guestAccessToken: new URL(first.data.accessUrl).hash.slice("#ticketAccess=".length),
  })
  expect(capability.success).toBe(true)
})

test("rejects stale prepared responses and cancelled URL persistence without changing the snapshot", async () => {
  const { t, workId } = await fixtureCreate()
  await t.run(
    async (ctx) =>
      await ctx.db.patch(workId, {
        deliveryMode: "paid",
        requestSnapshotJson: JSON.stringify({ deliveryMode: "paid", immutable: "snapshot" }),
        attemptCount: 0,
      }),
  )
  const promotedSnapshot = await t.run(async (ctx) => (await ctx.db.get(workId))!.requestSnapshotJson)
  expect(
    await t.mutation(internal.ticketing.ticketFulfillmentWorkPreparedMutation, {
      workId,
      fulfillmentReference: "old-response",
      deliveryMode: "tickets_only",
      attemptCount: 1,
    }),
  ).toMatchObject({ success: true, data: { stale: true, prepared: false } })
  expect(
    await t.mutation(internal.ticketing.ticketFulfillmentWorkOnlineUrlEnsureMutation, {
      workId,
      onlineTicketUrl: "https://eventoren.example/checkout#ticketAccess=token",
      deliveryMode: "tickets_only",
      attemptCount: 1,
    }),
  ).toMatchObject({ success: true, data: { stale: true } })
  await t.run(async (ctx) => await ctx.db.patch(workId, { cancelledAt: now }))
  const cancelled = await t.mutation(internal.ticketing.ticketFulfillmentWorkOnlineUrlEnsureMutation, {
    workId,
    onlineTicketUrl: "https://eventoren.example/checkout#ticketAccess=token",
    deliveryMode: "paid",
    attemptCount: 0,
  })
  expect(cancelled.success).toBe(false)
  const work = await t.run(async (ctx) => await ctx.db.get(workId))
  expect(work?.onlineTicketUrl).toBeUndefined()
  expect(work?.requestSnapshotJson).toBe(promotedSnapshot)
})
