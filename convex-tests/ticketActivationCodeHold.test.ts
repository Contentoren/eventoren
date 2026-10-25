/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.js"

const modules = import.meta.glob("../convex/**/*.ts")
const seededAt = "2026-10-25T00:00:00.000Z"
const eventKey = "hold-event"
const tierKey = "standard"
const code = "ABC12345"
const holdDurationMs = 15 * 60 * 1000

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv("EVENTOREN_BILLING_BASE_URL", "https://billing.example.com")
  vi.stubEnv("EVENTOREN_BILLING_ORGANIZATION_ID", "activation-code-hold-test")
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
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    const codeId = await ctx.db.insert("ticketActivationCodes", {
      eventId,
      tierId,
      eventKey,
      tierKey,
      code,
      number: 1,
      status: "available",
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    return { eventId, tierId, codeId }
  })
  return { t, ...seeded }
}

type Harness = Awaited<ReturnType<typeof harnessCreate>>

function reserveArgs(overrides: Record<string, unknown> = {}) {
  return { eventKey, tierKey, code, ...overrides }
}

async function codeRowRead(h: Harness) {
  return h.t.run(async (ctx) => await ctx.db.get("ticketActivationCodes", h.codeId))
}

async function reserve(h: Harness, overrides: Record<string, unknown> = {}) {
  return h.t.mutation(api.ticketing.ticketActivationCodeReserveMutation, reserveArgs(overrides))
}

/** The deadline is server-owned: it is the fixed 15 minute window from now. */
function expectServerDeadline(expiresAt: number | undefined) {
  const remaining = (expiresAt ?? 0) - Date.now()
  expect(remaining).toBeGreaterThan(holdDurationMs - 1000)
  expect(remaining).toBeLessThanOrEqual(holdDurationMs + 1000)
}

/** A pending order that owns nothing yet. */
async function orderCreate(
  h: Harness,
  overrides: {
    checkoutKey?: string
    status?: "reserved" | "checkout_created" | "paid" | "failed" | "expired" | "released"
    paymentStatus?: "pending" | "paid" | "failed" | "expired"
  } = {},
) {
  return h.t.run(async (ctx) => {
    const orderId: Id<"ticketOrders"> = await ctx.db.insert("ticketOrders", {
      checkoutKey: overrides.checkoutKey ?? "hold-checkout",
      customerEmail: "buyer@example.com",
      customerGivenName: "Ada",
      customerFamilyName: "Lovelace",
      customerAddress: "Street",
      customerPhone: "",
      contactSnapshotJson: "{}",
      eventKey,
      eventTitle: "Holds",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: seededAt,
      eventEndsAt: seededAt,
      eventDoorsAt: seededAt,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Eventoren",
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Stage",
      catalogVersion: 1,
      subtotalCents: 100,
      feeCents: 10,
      totalCents: 110,
      checkoutContextJson: "{}",
      paymentReference: "hold-payment",
      stripeMode: "test",
      status: overrides.status ?? "reserved",
      paymentStatus: overrides.paymentStatus ?? "pending",
      reservationExpiresAt: Date.now() + holdDurationMs,
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    return orderId
  })
}

/** The checkout adoption: the code, its history and the order line belong together. */
async function codeAttach(h: Harness, orderId: Id<"ticketOrders">) {
  await h.t.run(async (ctx) => {
    await ctx.db.patch("ticketActivationCodes", h.codeId, {
      status: "reserved",
      orderId,
      reservedAt: seededAt,
    })
    await ctx.db.insert("ticketActivationCodeReservations", {
      codeId: h.codeId,
      orderId,
      tierId: h.tierId,
      eventId: h.eventId,
      eventKey,
      tierKey,
      status: "reserved",
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    await ctx.db.insert("ticketOrderLines", {
      orderId,
      tierId: h.tierId,
      activationCodeId: h.codeId,
      eventKey,
      tierKey,
      tierName: "Standard",
      tierDescription: "",
      quantity: 1,
      priceCents: 100,
      feeCents: 10,
      createdAt: seededAt,
    })
  })
}

test("the first reservation hands out a credential and stores only its digest", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h, { code: ` ${code.toLowerCase()} ` })
  expect(reserved).toMatchObject({ success: true, data: { valid: true } })
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken
  const expiresAt = reserved.data.expiresAt
  expect(holdToken).toMatch(/^[0-9a-f]{64}$/)
  expect(typeof expiresAt).toBe("number")
  expectServerDeadline(expiresAt)

  const row = await codeRowRead(h)
  expect(row?.status).toBe("reserved")
  expect(row?.browserHoldDigest).toBeTruthy()
  expect(row?.browserHoldDigest).not.toBe(holdToken)
  expect(row?.browserHoldExpiresAt).toBe(expiresAt)
  expect(row?.orderId).toBeUndefined()
  expect(row?.consumedAt).toBeUndefined()
  const history = await h.t.run(async (ctx) => await ctx.db.query("ticketActivationCodeReservations").collect())
  expect(history).toHaveLength(0)
})

test("the same credential revalidates with the exact same deadline", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken
  const expiresAt = reserved.data.expiresAt

  const again = await reserve(h, { holdToken })
  expect(again).toMatchObject({ success: true, data: { valid: true } })
  if (!again.success) return
  expect(again.data.expiresAt).toBe(expiresAt)
  expect(again.data.holdToken).toBe(holdToken)
  const row = await codeRowRead(h)
  expect(row?.browserHoldExpiresAt).toBe(expiresAt)
})

test("a foreign credential cannot claim a live hold", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const digest = (await codeRowRead(h))?.browserHoldDigest

  const foreign = await reserve(h, { holdToken: "f".repeat(64) })
  expect(foreign).toMatchObject({ success: true, data: { valid: false } })
  const anonymous = await reserve(h)
  expect(anonymous).toMatchObject({ success: true, data: { valid: false } })
  const row = await codeRowRead(h)
  expect(row?.browserHoldDigest).toBe(digest)
  expect(row?.status).toBe("reserved")
})

test("an expired hold that is still stored keeps its credential and restarts the window", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken

  await h.t.run(async (ctx) => {
    await ctx.db.patch("ticketActivationCodes", h.codeId, { browserHoldExpiresAt: Date.now() - 1000 })
  })
  const restarted = await reserve(h, { holdToken })
  expect(restarted).toMatchObject({ success: true, data: { valid: true } })
  if (!restarted.success) return
  expect(restarted.data.holdToken).toBe(holdToken)
  expectServerDeadline(restarted.data.expiresAt)
})

test("a released hold starts a fresh window with a new credential", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return

  await vi.advanceTimersByTimeAsync(holdDurationMs + 1000)
  const released = await codeRowRead(h)
  expect(released?.status).toBe("available")
  expect(released?.browserHoldDigest).toBeUndefined()

  const again = await reserve(h, { holdToken: reserved.data.holdToken })
  expect(again).toMatchObject({ success: true, data: { valid: true } })
  if (!again.success) return
  expect(again.data.holdToken).not.toBe(reserved.data.holdToken)
  expectServerDeadline(again.data.expiresAt)
})

test("the scheduled expiry releases an unattached expired hold", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return

  await vi.advanceTimersByTimeAsync(holdDurationMs + 1000)
  await h.t.finishAllScheduledFunctions(vi.runAllTimers)
  const row = await codeRowRead(h)
  expect(row?.status).toBe("available")
  expect(row?.browserHoldDigest).toBeUndefined()
  expect(row?.browserHoldExpiresAt).toBeUndefined()
})

test("the expiry never releases a stale or replaced hold", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const row = await codeRowRead(h)
  const digest = row?.browserHoldDigest
  const expiresAt = row?.browserHoldExpiresAt
  expect(digest).toBeTruthy()

  const stale = await h.t.mutation(internal.ticketing.ticketActivationCodeHoldExpireMutation, {
    codeId: h.codeId,
    holdDigest: "0".repeat(64),
    expiresAt: expiresAt ?? 0,
  })
  expect(stale).toMatchObject({ success: true, data: { released: false } })
  const unchanged = await codeRowRead(h)
  expect(unchanged?.browserHoldDigest).toBe(digest)
  expect(unchanged?.browserHoldExpiresAt).toBe(expiresAt)
  expect(unchanged?.status).toBe("reserved")
})

test("the expiry never releases a charged code", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const row = await codeRowRead(h)
  const digest = row?.browserHoldDigest
  const expiresAt = row?.browserHoldExpiresAt

  await h.t.run(async (ctx) => {
    await ctx.db.patch("ticketActivationCodes", h.codeId, {
      status: "consumed",
      consumedAt: seededAt,
    })
  })
  const charged = await h.t.mutation(internal.ticketing.ticketActivationCodeHoldExpireMutation, {
    codeId: h.codeId,
    holdDigest: digest ?? "",
    expiresAt: expiresAt ?? 0,
  })
  expect(charged).toMatchObject({ success: true, data: { released: false } })
  const after = await codeRowRead(h)
  expect(after?.status).toBe("consumed")
  expect(after?.consumedAt).toBe(seededAt)
})

test("the expiry delegates an attached code to the existing order expiry", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const row = await codeRowRead(h)
  const digest = row?.browserHoldDigest
  const expiresAt = row?.browserHoldExpiresAt

  const orderId = await h.t.run(async (ctx) => {
    const orderId: Id<"ticketOrders"> = await ctx.db.insert("ticketOrders", {
      checkoutKey: "hold-checkout",
      customerEmail: "buyer@example.com",
      customerGivenName: "Ada",
      customerFamilyName: "Lovelace",
      customerAddress: "Street",
      customerPhone: "",
      contactSnapshotJson: "{}",
      eventKey,
      eventTitle: "Holds",
      eventSubtitle: "",
      eventDescription: "",
      eventStartsAt: seededAt,
      eventEndsAt: seededAt,
      eventDoorsAt: seededAt,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Eventoren",
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Stage",
      catalogVersion: 1,
      subtotalCents: 100,
      feeCents: 10,
      totalCents: 110,
      checkoutContextJson: "{}",
      paymentReference: "hold-payment",
      stripeMode: "test",
      status: "reserved",
      paymentStatus: "pending",
      reservationExpiresAt: Date.now() - 1000,
      createdAt: seededAt,
      updatedAt: seededAt,
    })
    await ctx.db.patch("ticketActivationCodes", h.codeId, { orderId })
    return orderId
  })
  expect(orderId).toBeTruthy()

  const delegated = await h.t.mutation(internal.ticketing.ticketActivationCodeHoldExpireMutation, {
    codeId: h.codeId,
    holdDigest: digest ?? "",
    expiresAt: expiresAt ?? 0,
  })
  expect(delegated).toMatchObject({ success: true, data: { released: false } })

  // The delegated order expiry asks the provider; an uncertain answer keeps
  // the code held instead of releasing it.
  const expire = vi.spyOn(billingEventorenClient, "ticketCheckoutExpire").mockResolvedValue({
    success: false,
    op: "billingEventorenTicketCheckoutExpire",
    errorMessage: "The provider is unreachable",
  })
  await vi.advanceTimersByTimeAsync(1)
  expect(expire).toHaveBeenCalled()
  const after = await codeRowRead(h)
  expect(after?.status).toBe("reserved")
  expect(after?.browserHoldDigest).toBe(digest)
  const order = await h.t.run(async (ctx) => await ctx.db.get("ticketOrders", orderId))
  expect(order?.status).toBe("reserved")
  expect(order?.paymentStatus).toBe("pending")
})

test("a code with a conflicting order history is not reservable", async () => {
  const h = await harnessCreate()
  await h.t.run(async (ctx) => {
    await ctx.db.insert("ticketActivationCodeReservations", {
      codeId: h.codeId,
      orderId: await ctx.db.insert("ticketOrders", {
        checkoutKey: "conflict-checkout",
        customerEmail: "buyer@example.com",
        customerGivenName: "Ada",
        customerFamilyName: "Lovelace",
        customerAddress: "Street",
        customerPhone: "",
        contactSnapshotJson: "{}",
        eventKey,
        eventTitle: "Holds",
        eventSubtitle: "",
        eventDescription: "",
        eventStartsAt: seededAt,
        eventEndsAt: seededAt,
        eventDoorsAt: seededAt,
        venue: "Hall",
        city: "Berlin",
        address: "Street",
        organizer: "Eventoren",
        imageUrl: "https://example.com/image.jpg",
        imageAlt: "Stage",
        catalogVersion: 1,
        subtotalCents: 100,
        feeCents: 10,
        totalCents: 110,
        checkoutContextJson: "{}",
        paymentReference: "conflict-payment",
        stripeMode: "test",
        status: "reserved",
        paymentStatus: "pending",
        reservationExpiresAt: Date.now() + holdDurationMs,
        createdAt: seededAt,
        updatedAt: seededAt,
      }),
      tierId: h.tierId,
      eventId: h.eventId,
      eventKey,
      tierKey,
      status: "reserved",
      createdAt: seededAt,
      updatedAt: seededAt,
    })
  })

  const reserved = await reserve(h)
  expect(reserved).toMatchObject({ success: true, data: { valid: false } })
  const row = await codeRowRead(h)
  expect(row?.status).toBe("available")
  expect(row?.browserHoldDigest).toBeUndefined()
})

test("a consumed code never validates for the browser that still holds its credential", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken
  const expiresAt = reserved.data.expiresAt

  // The charge ends the browser hold, but stale hold fields may survive.
  await h.t.run(async (ctx) => {
    await ctx.db.patch("ticketActivationCodes", h.codeId, { status: "consumed", consumedAt: seededAt })
  })

  const replay = await reserve(h, { holdToken })
  expect(replay).toMatchObject({ success: true, data: { valid: false } })
  const row = await codeRowRead(h)
  expect(row?.status).toBe("consumed")
  expect(row?.consumedAt).toBe(seededAt)
  // The charged code is not touched by the rejected replay.
  expect(row?.browserHoldExpiresAt).toBe(expiresAt)
})

test("a charged order history blocks the holder even when the code status is stale", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken

  const orderId = await orderCreate(h)
  await h.t.run(async (ctx) => {
    await ctx.db.insert("ticketActivationCodeReservations", {
      codeId: h.codeId,
      orderId,
      tierId: h.tierId,
      eventId: h.eventId,
      eventKey,
      tierKey,
      status: "consumed",
      createdAt: seededAt,
      updatedAt: seededAt,
    })
  })
  // The code row still looks uncharged: the charged history is the truth.
  expect((await codeRowRead(h))?.status).toBe("reserved")

  const replay = await reserve(h, { holdToken })
  expect(replay).toMatchObject({ success: true, data: { valid: false } })
  const row = await codeRowRead(h)
  expect(row?.status).toBe("reserved")
  expect(row?.browserHoldDigest).toBeTruthy()
})

test("the holder revalidates its own pending order without renewing the deadline", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken
  const expiresAt = reserved.data.expiresAt

  const orderId = await orderCreate(h)
  await codeAttach(h, orderId)

  const replay = await reserve(h, { holdToken })
  expect(replay).toMatchObject({ success: true, data: { valid: true } })
  if (!replay.success) return
  expect(replay.data.holdToken).toBe(holdToken)
  expect(replay.data.expiresAt).toBe(expiresAt)
  const row = await codeRowRead(h)
  expect(row?.browserHoldExpiresAt).toBe(expiresAt)
  expect(row?.orderId).toBe(orderId)
})

test("a settled order does not revalidate for its holder", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken

  const orderId = await orderCreate(h, { status: "paid", paymentStatus: "paid" })
  await codeAttach(h, orderId)

  const replay = await reserve(h, { holdToken })
  expect(replay).toMatchObject({ success: true, data: { valid: false } })
  const row = await codeRowRead(h)
  expect(row?.status).toBe("reserved")
})

test("a missing order fails closed and repairs nothing", async () => {
  const h = await harnessCreate()
  const reserved = await reserve(h)
  expect(reserved.success).toBe(true)
  if (!reserved.success) return
  const holdToken = reserved.data.holdToken

  const orderId = await orderCreate(h)
  await codeAttach(h, orderId)
  await h.t.run(async (ctx) => {
    await ctx.db.delete("ticketOrders", orderId)
  })

  const replay = await reserve(h, { holdToken })
  expect(replay).toMatchObject({ success: true, data: { valid: false } })
  const row = await codeRowRead(h)
  // The corrupt row stays untouched: it is never released automatically.
  expect(row?.status).toBe("reserved")
  expect(row?.orderId).toBe(orderId)
  expect(row?.browserHoldDigest).toBeTruthy()
})
