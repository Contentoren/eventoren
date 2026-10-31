/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const secret = "overview-test-secret"
process.env.AUTH_SECRET = secret
const now = "2026-10-01T00:00:00.000Z"
async function setup(role: "admin" | "user" = "admin") {
  const t = convexTest(schema, modules)
  const userId = await t.run((ctx) => ctx.db.insert("users", { name: role, role, createdAt: now, updatedAt: now }))
  const token = await createToken(userId, secret)
  await t.run(async (ctx) => {
    await ctx.db.insert("authSessions", {
      userId,
      loginMethod: "dev",
      token,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogEvents", {
      eventKey: "event",
      title: "Test",
      subtitle: "",
      description: "",
      category: "konzerte",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Organizer",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "draft",
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
  })
  return { t, token, userId }
}
async function seed(
  s: Awaited<ReturnType<typeof setup>>,
  opts: {
    paymentStatus?: "paid" | "pending"
    cancelled?: boolean
    mismatch?: boolean
    missing?: boolean
    orderCancelled?: boolean
  } = {},
) {
  await s.t.run(async (ctx) => {
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: crypto.randomUUID(),
      ownerUserId: s.userId,
      customerEmail: " Buyer@Example.com ",
      customerGivenName: "A",
      customerFamilyName: "B",
      customerPhone: "",
      contactSnapshotJson: "{}",
      eventKey: opts.mismatch ? "other" : "event",
      eventTitle: "Test",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: now,
      eventEndsAt: now,
      eventDoorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Organizer",
      imageUrl: "",
      imageAlt: "",
      catalogVersion: 1,
      subtotalCents: 1,
      feeCents: 0,
      totalCents: 1,
      checkoutContextJson: "{}",
      paymentReference: crypto.randomUUID(),
      stripeMode: "test",
      status: "paid",
      paymentStatus: opts.paymentStatus ?? "paid",
      reservationExpiresAt: Date.now() + 60000,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("ticketIssued", {
      orderId,
      sequence: 1,
      ownerUserId: s.userId,
      code: crypto.randomUUID(),
      eventKey: "event",
      eventTitle: "Test",
      eventStartsAt: now,
      eventDoorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      tierKey: "standard",
      tierName: "Standard",
      priceCents: 1,
      feeCents: 0,
      issuedAt: now,
      cancelled: opts.cancelled,
    })
    if (opts.orderCancelled)
      await ctx.db.patch("ticketOrders", orderId, {
        cancellation: {
          cancelledAt: now,
          organizationId: "org",
          eventKey: "event",
          orderReference: "order",
          paymentReference: "payment",
          stripeMode: "test",
          paymentMethodType: "sepa_debit",
          stripeEventId: "evt",
          stripeSessionId: "session",
          stripePaymentIntentId: "intent",
          reason: "payment_failed",
          stripeEventType: "checkout.session.async_payment_failed",
          stripeChargeId: null,
          stripeDisputeId: null,
        },
      })
    if (opts.missing) await ctx.db.delete("ticketOrders", orderId)
  })
}
const input = (token: string, numItems = 1, cursor: string | null = null) => ({
  token,
  eventKey: "event",
  paginationOpts: { numItems, cursor },
})

test("only admins can access an existing event and empty pages retain metadata", async () => {
  const s = await setup()
  const empty = await s.t.query(api.catalog.eventOverviewPage, input(s.token))
  expect(empty.success && empty.data.page).toEqual([])
  expect(empty.success && empty.data.isDone).toBe(true)
  expect((await s.t.query(api.catalog.eventOverviewPage, input(""))).success).toBe(false)
  expect((await s.t.query(api.catalog.eventOverviewPage, { ...input(s.token), eventKey: "missing" })).success).toBe(
    false,
  )
  const u = await setup("user")
  expect((await u.t.query(api.catalog.eventOverviewPage, input(u.token))).success).toBe(false)
})

test("pages continue without dropping paid, pending or cancelled tickets", async () => {
  const s = await setup()
  await seed(s)
  await seed(s, { paymentStatus: "pending" })
  await seed(s, { cancelled: true })
  await seed(s, { orderCancelled: true })
  let cursor: string | null = null
  const counts: number[] = []
  do {
    const result = await s.t.query(api.catalog.eventOverviewPage, input(s.token, 1, cursor))
    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.errorMessage)
    counts.push(...result.data.page.map((row) => row.soldTicketCount))
    expect(typeof result.data.continueCursor).toBe("string")
    cursor = result.data.isDone ? null : result.data.continueCursor
  } while (cursor !== null)
  expect(counts.sort()).toEqual([0, 0, 0, 1])
})

test("missing or mismatched orders fail closed", async () => {
  for (const opts of [{ mismatch: true }, { missing: true }]) {
    const s = await setup()
    await seed(s, opts)
    expect((await s.t.query(api.catalog.eventOverviewPage, input(s.token))).success).toBe(false)
  }
})

test("expanded live ranges split before joining orders and leaves cover each ticket once", async () => {
  const s = await setup()
  for (let i = 0; i < 12; i++) await seed(s)
  let endCursor: string | null = null
  for (let i = 0; i < 10; i++) {
    const result = await s.t.query(api.catalog.eventOverviewPage, input(s.token, 1, endCursor))
    if (!result.success) throw new Error(result.errorMessage)
    endCursor = result.data.continueCursor
  }
  const orderId = await s.t.run(async (ctx) => {
    const ticket = await ctx.db.query("ticketIssued").first()
    if (!ticket) throw new Error("missing fixture ticket")
    await ctx.db.patch("ticketOrders", ticket.orderId, { eventKey: "other" })
    return ticket.orderId
  })
  const queryRange = (cursor: string | null, end: string) =>
    s.t.query(api.catalog.eventOverviewPage, {
      ...input(s.token, 1, cursor),
      paginationOpts: { numItems: 1, cursor, endCursor: end },
    })
  if (!endCursor) throw new Error("missing end cursor")
  const parent = await queryRange(null, endCursor)
  expect(parent.success).toBe(true)
  if (!parent.success) throw new Error(parent.errorMessage)
  expect(parent.data.page).toEqual([])
  expect(parent.data.pageStatus).toBe("SplitRequired")
  expect(parent.data.splitCursor).toBeTruthy()
  await s.t.run((ctx) => ctx.db.patch("ticketOrders", orderId, { eventKey: "event" }))
  const ids: string[] = []
  async function visit(cursor: string | null, end: string): Promise<void> {
    const result = await queryRange(cursor, end)
    if (!result.success) throw new Error(result.errorMessage)
    if (result.data.pageStatus === "SplitRequired") {
      const split = result.data.splitCursor
      if (!split) throw new Error("missing split cursor")
      await visit(cursor, split)
      await visit(split, end)
      return
    }
    ids.push(...result.data.page.map((ticket) => ticket.ticketId))
  }
  await visit(null, endCursor)
  const expected = await s.t.run(async (ctx) =>
    (await ctx.db.query("ticketIssued").take(10)).map((ticket) => ticket._id),
  )
  expect(ids).toEqual(expected)
  expect(new Set(ids).size).toBe(10)
})

test("a page of only unpaid tickets has zero sales and counts pending payments", async () => {
  const s = await setup()
  await seed(s, { paymentStatus: "pending" })
  const result = await s.t.query(api.catalog.eventOverviewPage, input(s.token, 50))
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.isDone).toBe(true)
  expect(
    result.data.page.map(({ soldTicketCount, pendingPaymentTicketCount, buyerKey }) => ({
      soldTicketCount,
      pendingPaymentTicketCount,
      buyerKey,
    })),
  ).toEqual([{ soldTicketCount: 0, pendingPaymentTicketCount: 1, buyerKey: null }])
})

test("query rejects out-of-range and fractional page sizes", async () => {
  const s = await setup()
  for (const n of [0, 51, 1.5])
    expect((await s.t.query(api.catalog.eventOverviewPage, input(s.token, n))).success).toBe(false)
})
