/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Doc, Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"
import { ticketFulfillmentWorkSnapshotCreate } from "../src/ticketing/convex/ticketFulfillmentWorkSnapshotCreate.ts"
import { ticketAccessDigestCreate } from "../src/ticketing/convex/ticketAccessDigestCreate.ts"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.ts"
import type { TicketPaymentReconcileScan } from "../src/ticketing/convex/ticketPaymentReconcileScanValidator.ts"
import { createResult } from "#result"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "ticket-read-bounds-test-secret"
// Legacy per-product default: tiers without a stored maxPerOrder allow 10 each.
const ticketMaxPerOrder = 10
const now = Date.parse("2026-10-02T12:00:00.000Z")
const future = "2026-11-01T22:00:00.000Z"
const past = "2026-10-01T22:00:00.000Z"
type OrderInput = Omit<Doc<"ticketOrders">, "_id" | "_creationTime">
type TestContext = ReturnType<typeof convexTest>

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

test.each(["live", "test"] as const)(
  "reconciliation keeps all four status caps and oldest-updated order in %s mode across bounded pages",
  async (stripeMode) => {
    // Rejected filter rows count towards real query read limits as well as the
    // native page budget. A take(25)-with-filter regression would exceed 100.
    const t = convexTest({ schema, modules, transactionLimits: { documentsRead: 100 } })
    const expected: Id<"ticketOrders">[] = []
    await t.run(async (ctx) => {
      for (const status of ["reserved", "checkout_created", "expired", "released"] as const) {
        // Other Stripe mode must never occupy a selection slot, even when older.
        for (let index = 0; index < 30; index++)
          await ctx.db.insert(
            "ticketOrders",
            orderInput(`${status}-other-${index}`, {
              status,
              stripeMode: stripeMode === "live" ? "test" : "live",
              updatedAt: timestamp(index),
            }),
          )
        if (status === "expired" || status === "released") {
          // More than a batch of ended events must not hide the eligible tail.
          for (let index = 0; index < 230; index++)
            await ctx.db.insert(
              "ticketOrders",
              orderInput(`${status}-ended-${index}`, {
                status,
                stripeMode,
                eventEndsAt: past,
                updatedAt: timestamp(index),
              }),
            )
          await ctx.db.insert(
            "ticketOrders",
            orderInput(`${status}-exact-cutoff`, {
              status,
              stripeMode,
              eventEndsAt: new Date(now).toISOString(),
              updatedAt: timestamp(230),
            }),
          )
        }
        // Insert in reverse updatedAt order; alternate end dates so an end-time
        // index cannot accidentally pass by selecting/sorting the wrong 25 rows.
        const ids: Id<"ticketOrders">[] = []
        for (let index = 29; index >= 0; index--) {
          ids[index] = await ctx.db.insert(
            "ticketOrders",
            orderInput(`${status}-eligible-${index}`, {
              status,
              stripeMode,
              eventEndsAt:
                status === "reserved" || status === "checkout_created"
                  ? past
                  : index % 2 === 0
                    ? future
                    : "2026-12-01T22:00:00.000Z",
              updatedAt: timestamp(300 + index),
              billingOrderReference: `${status}-billing-${index}`,
            }),
          )
        }
        expected.push(...ids.slice(0, 25))
      }
      for (const status of ["paid", "failed", "paid_inventory_conflict"] as const)
        await ctx.db.insert(
          "ticketOrders",
          orderInput(`excluded-${status}`, {
            status,
            stripeMode,
            updatedAt: timestamp(0),
          }),
        )
    })

    const result = await t.query(internal.ticketing.ticketPaymentReconcileScheduledContextQuery, { stripeMode, now })
    expect(result.success).toBe(true)
    if (!result.success) return
    const contexts = [...result.data]
    for (const status of ["expired", "released"] as const) {
      const firstArgs = { stripeMode, now, status, cursor: null, numItems: 25 }
      const first = await t.query(internal.ticketing.ticketPaymentReconcileTerminalPageQuery, firstArgs)
      expect(first).toMatchObject({ success: true, data: { contexts: [], isDone: false } })
      // Repeating exactly the same page arguments retries the same range.
      expect(await t.query(internal.ticketing.ticketPaymentReconcileTerminalPageQuery, firstArgs)).toEqual(first)
      const terminal = await terminalSelectionRead(t, stripeMode, status)
      expect(terminal.pages).toBe(3)
      contexts.push(...terminal.contexts)
    }
    expect(contexts.map((order) => order.orderId)).toEqual(expected)
    expect(contexts).toHaveLength(100)
    expect(contexts.every((order) => order.stripeMode === stripeMode)).toBe(true)
    expect(result.data[0]).toMatchObject({
      paymentReference: "reserved-eligible-0",
      billingOrderReference: "reserved-billing-0",
    })
  },
)

test("reconciliation preserves equal-updated creation ordering and terminal date validation", async () => {
  const t = convexTest(schema, modules)
  const expected = await t.run(async (ctx) => {
    const first = await ctx.db.insert("ticketOrders", orderInput("first", { status: "reserved" }))
    const second = await ctx.db.insert("ticketOrders", orderInput("second", { status: "reserved" }))
    await ctx.db.insert("ticketOrders", orderInput("invalid", { status: "expired", eventEndsAt: "zzz-invalid" }))
    // Lexically future, but Date.parse places it before the cutoff.
    await ctx.db.insert(
      "ticketOrders",
      orderInput("offset-past", {
        status: "expired",
        eventEndsAt: "2026-10-02T13:00:00+02:00",
      }),
    )
    const valid = await ctx.db.insert("ticketOrders", orderInput("valid", { status: "expired" }))
    return [first, second, valid]
  })
  const result = await t.query(internal.ticketing.ticketPaymentReconcileScheduledContextQuery, {
    stripeMode: "test",
    now,
  })
  expect(result.success).toBe(true)
  const terminal = await terminalSelectionRead(t, "test", "expired")
  if (result.success) expect([...result.data, ...terminal.contexts].map((order) => order.orderId)).toEqual(expected)
})

test("terminal selection continues past a whole page of invalid lexically-future dates without spending the cap", async () => {
  const t = convexTest({ schema, modules, transactionLimits: { documentsRead: 100 } })
  await t.run(async (ctx) => {
    for (let index = 0; index < 30; index++)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`invalid-${index}`, {
          status: "expired",
          eventEndsAt: "zzz-invalid",
          updatedAt: timestamp(index),
        }),
      )
    for (let index = 29; index >= 0; index--)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`valid-${index}`, {
          status: "expired",
          updatedAt: timestamp(100 + index),
        }),
      )
  })
  const selected = await terminalSelectionRead(t, "test", "expired")
  expect(selected.pages).toBe(3)
  expect(selected.contexts.map((order) => order.paymentReference)).toEqual(
    Array.from({ length: 25 }, (_, index) => `valid-${index}`),
  )
})

test.each(["live", "test"] as const)(
  "scheduled reconciliation persists empty-page progress, fixed cutoff, status ordering and caps in %s mode",
  async (stripeMode) => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
    process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
    process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
    process.env.EVENTOREN_BILLING_STRIPE_MODE = stripeMode
    process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
    const requested: string[] = []
    vi.spyOn(billingEventorenClient, "statusGet").mockImplementation(async (_config, reference) => {
      requested.push(reference)
      // The failure mutation updates updatedAt: partial selections must be held
      // until the cap/end to avoid moving their rows past their own scan cursor.
      return createResult({ kind: "not_found" as const })
    })
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      for (const status of ["reserved", "checkout_created", "expired", "released"] as const) {
        if (status === "expired" || status === "released")
          for (let index = 0; index < 230; index++)
            await ctx.db.insert(
              "ticketOrders",
              orderInput(`${status}-ended-${index}`, {
                status,
                stripeMode,
                eventEndsAt: past,
                updatedAt: timestamp(index),
              }),
            )
        for (let index = 29; index >= 0; index--)
          await ctx.db.insert(
            "ticketOrders",
            orderInput(`${status}-eligible-${index}`, {
              status,
              stripeMode,
              updatedAt: timestamp(300 + index),
            }),
          )
        await ctx.db.insert(
          "ticketOrders",
          orderInput(`${status}-other-mode`, {
            status,
            stripeMode: stripeMode === "test" ? "live" : "test",
          }),
        )
      }
    })
    expect(await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, {})).toMatchObject({
      success: true,
    })
    const activeExpected = ["reserved", "checkout_created"].flatMap((status) =>
      Array.from({ length: 25 }, (_, index) => `${status}-eligible-${index}`),
    )
    expect(requested).toEqual(activeExpected)
    const firstJob = await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").first())
    expect(firstJob?.args).toMatchObject([{ scan: { status: "expired", now, stripeMode, selected: [] } }])
    expect((firstJob?.args[0] as { scan: TicketPaymentReconcileScan }).scan.cursor).not.toBeNull()
    // Let wall time change between pages: the original predicate/cursor must be
    // reused, rather than constructing a new query fingerprint on each page.
    vi.setSystemTime(now + 60_000)
    await t.finishAllScheduledFunctions(vi.runAllTimers)
    expect(requested).toEqual([
      ...activeExpected,
      ...["expired", "released"].flatMap((status) =>
        Array.from({ length: 25 }, (_, index) => `${status}-eligible-${index}`),
      ),
    ])
    const jobs = await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").collect())
    expect(jobs).toHaveLength(5)
    expect(jobs.every((job) => job.state.kind === "success")).toBe(true)
    expect(jobs.every((job) => (job.args[0] as { scan: TicketPaymentReconcileScan }).scan.now === now)).toBe(true)
  },
)

test("scheduled selection keeps partial contexts across retries and never reselects them after failure writes", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  const requested: string[] = []
  vi.spyOn(billingEventorenClient, "statusGet").mockImplementation(async (_config, reference) => {
    requested.push(reference)
    return createResult({ kind: "not_found" as const })
  })
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (let index = 0; index < 10; index++)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`first-${index}`, { status: "expired", updatedAt: timestamp(index) }),
      )
    for (let index = 0; index < 230; index++)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`ended-${index}`, {
          status: "expired",
          eventEndsAt: past,
          updatedAt: timestamp(20 + index),
        }),
      )
    for (let index = 0; index < 20; index++)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`tail-${index}`, { status: "expired", updatedAt: timestamp(300 + index) }),
      )
  })
  await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, {})
  expect(requested).toEqual([])
  const job = await t.run(async (ctx) => ctx.db.system.query("_scheduled_functions").first())
  expect((job?.args[0] as { scan: TicketPaymentReconcileScan }).scan.selected).toHaveLength(10)
  if (!job) throw new Error("The partial selection must schedule a continuation")
  const retryArgs = job.args[0] as { scan: TicketPaymentReconcileScan }
  await t.run(async (ctx) => ctx.scheduler.cancel(job._id))
  await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, retryArgs)
  const retryJob = await t.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").collect()).find((entry) => entry.state.kind === "pending"),
  )
  if (!retryJob) throw new Error("The retried empty page must schedule a continuation")
  expect((retryJob.args[0] as { scan: TicketPaymentReconcileScan }).scan.selected).toEqual(retryArgs.scan.selected)
  await t.run(async (ctx) => ctx.scheduler.cancel(retryJob._id))
  await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, retryArgs)
  const replayJob = await t.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").collect()).find((entry) => entry.state.kind === "pending"),
  )
  expect(replayJob?.args).toEqual(retryJob.args)
  expect(requested).toEqual([])
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(requested).toEqual([
    ...Array.from({ length: 10 }, (_, index) => `first-${index}`),
    ...Array.from({ length: 15 }, (_, index) => `tail-${index}`),
  ])
  expect(new Set(requested).size).toBe(25)
  // A fresh cron run starts from the oldest remaining eligible row. Previously
  // checked rows are still retryable, but their new updatedAt no longer crowds
  // out the five untouched rows (ended records still cannot starve them).
  requested.length = 0
  await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, {})
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(requested.slice(0, 5)).toEqual(Array.from({ length: 5 }, (_, index) => `tail-${15 + index}`))
  expect(requested).toHaveLength(25)
})

test("scheduled terminal continuation deduplicates selected rows moved past its cursor by another checker", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  const requested: string[] = []
  vi.spyOn(billingEventorenClient, "statusGet").mockImplementation(async (_config, reference) => {
    requested.push(reference)
    return createResult({ kind: "not_found" as const })
  })
  const t = convexTest(schema, modules)
  const movedId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("ticketOrders", orderInput("selected-first", { status: "expired" }))
    for (let index = 0; index < 100; index++)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`ended-${index}`, {
          status: "expired",
          eventEndsAt: past,
          updatedAt: timestamp(20 + index),
        }),
      )
    await ctx.db.insert("ticketOrders", orderInput("eligible-tail", { status: "expired", updatedAt: timestamp(200) }))
    return id
  })
  await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, {})
  expect(requested).toEqual([])
  await t.run(async (ctx) => ctx.db.patch(movedId, { updatedAt: new Date(now).toISOString() }))
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(requested).toEqual(["selected-first", "eligible-tail"])
})

test("terminal page rejects invalid caps and cutoff and continuation rejects a changed Stripe mode", async () => {
  const t = convexTest(schema, modules)
  for (const numItems of [0, 26, 1.5])
    expect(
      await t.query(internal.ticketing.ticketPaymentReconcileTerminalPageQuery, {
        stripeMode: "test",
        now,
        status: "expired",
        cursor: null,
        numItems,
      }),
    ).toMatchObject({ success: false })
  expect(
    await t.query(internal.ticketing.ticketPaymentReconcileTerminalPageQuery, {
      stripeMode: "test",
      now: 1e20,
      status: "expired",
      cursor: null,
      numItems: 25,
    }),
  ).toMatchObject({ success: false })
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "live"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  expect(
    await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, {
      scan: { stripeMode: "test", now, status: "expired", cursor: null, selected: [] },
    }),
  ).toMatchObject({ success: false, errorMessage: "The reconciliation Stripe mode changed" })
})

test("scheduled active-to-expired transitions do not consume terminal selection slots in the same chain", async () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  const requested: string[] = []
  vi.spyOn(billingEventorenClient, "statusGet").mockImplementation(async (_config, reference) => {
    requested.push(reference)
    if (reference !== "active") return createResult({ kind: "not_found" as const })
    return createResult({
      kind: "status" as const,
      data: {
        paymentReference: reference,
        orderReference: "active-billing",
        stripeMode: "test" as const,
        status: "expired" as const,
        payment: "expired" as const,
        expiresAt: null,
        bookingNumber: null,
        bookingReference: null,
      },
    })
  })
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    await ctx.db.insert("ticketOrders", orderInput("active", { status: "reserved", paymentStatus: "pending" }))
    for (let index = 0; index < 230; index++)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`ended-${index}`, {
          status: "expired",
          eventEndsAt: past,
          updatedAt: timestamp(index),
        }),
      )
    for (let index = 0; index < 10; index++)
      await ctx.db.insert(
        "ticketOrders",
        orderInput(`terminal-${index}`, {
          status: "expired",
          updatedAt: timestamp(300 + index),
        }),
      )
  })
  await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, {})
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  expect(requested).toEqual(["active", ...Array.from({ length: 10 }, (_, index) => `terminal-${index}`)])
})

async function terminalSelectionRead(t: TestContext, stripeMode: "live" | "test", status: "expired" | "released") {
  const contexts: TicketPaymentReconcileScan["selected"] = []
  let cursor: string | null = null
  for (let pages = 1; pages <= 20; pages++) {
    const result = await t.query(internal.ticketing.ticketPaymentReconcileTerminalPageQuery, {
      stripeMode,
      now,
      status,
      cursor,
      numItems: 25 - contexts.length,
    })
    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.errorMessage)
    contexts.push(...result.data.contexts)
    if (result.data.isDone || contexts.length === 25) return { contexts, pages }
    expect(result.data.continueCursor).not.toEqual(cursor)
    cursor = result.data.continueCursor
  }
  throw new Error("Terminal selection did not finish within the fixture's page bound")
}

test("admin detail returns every valid order line in creation order and keeps authentication and role checks", async () => {
  process.env.AUTH_SECRET = authSecret
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const ownerId = await userInsert(t, "user")
  const foreignId = await t.run(async (ctx) => ctx.db.insert("ticketOrders", orderInput("foreign")))
  await orderDetailsInsert(t, foreignId, 30)
  const orderId = await t.run(async (ctx) =>
    ctx.db.insert("ticketOrders", orderInput("admin-detail", { ownerUserId: ownerId })),
  )
  await orderDetailsInsert(t, orderId, ticketMaxPerOrder)

  const result = await t.query(api.ticketing.ticketOrderGetAdminQuery, {
    token: await testAuthSessionTokenCreate(t, adminId, authSecret),
    orderId,
  })
  expect(result.success).toBe(true)
  if (result.success)
    expect(result.data).toMatchObject({
      id: orderId,
      customerEmail: "customer@example.test",
      stripeMode: "test",
      lines: Array.from({ length: ticketMaxPerOrder }, (_, index) => ({
        tierName: `Tier ${index + 1}`,
        quantity: 1,
        priceCents: 1000,
        feeCents: 100,
      })),
    })
  for (const token of [await testAuthSessionTokenCreate(t, ownerId, authSecret), ""]) {
    const rejected = await t.query(api.ticketing.ticketOrderGetAdminQuery, { token, orderId })
    expect(rejected.success).toBe(false)
  }
})

test("fulfillment includes every valid issued ticket in sequence order and immutable legal context", async () => {
  const t = convexTest(schema, modules)
  const foreignId = await t.run(async (ctx) => ctx.db.insert("ticketOrders", orderInput("foreign")))
  await orderDetailsInsert(t, foreignId, 30)
  const orderId = await t.run(async (ctx) =>
    ctx.db.insert("ticketOrders", orderInput("fulfillment", { stripeMode: "live" })),
  )
  await orderDetailsInsert(t, orderId, ticketMaxPerOrder)

  const result = await t.run(async (ctx) => ticketFulfillmentWorkSnapshotCreate(ctx, orderId, "billing-live"))
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toMatchObject({
    orderReference: "billing-live",
    paymentReference: "fulfillment",
    event: { eventKey: "event", title: "Event", endsAt: future },
    locale: "de",
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true,
      privacyAcknowledged: true,
      documentSetRevision: "immutable-revision",
      termsMarkdown: "Immutable terms",
      privacyMarkdown: "Immutable privacy",
    },
  })
  expect(result.data.tickets).toHaveLength(ticketMaxPerOrder)
  expect(
    result.data.tickets.map((ticket) => ({
      sequence: ticket.sequence,
      admissionCode: ticket.admissionCode,
      tierKey: ticket.tierKey,
      tierLabel: ticket.tierLabel,
      participantName: ticket.participantName,
    })),
  ).toEqual(
    Array.from({ length: ticketMaxPerOrder }, (_, index) => ({
      sequence: index + 1,
      admissionCode: `ticket-${orderId}-${index + 1}`,
      tierKey: `tier-${index + 1}`,
      tierLabel: `Tier ${index + 1}`,
      participantName: `Participant ${index + 1}`,
    })),
  )
})

test("per-order readers return complete snapshots above ten when each product stays within its limit", async () => {
  process.env.AUTH_SECRET = authSecret
  const t = convexTest(schema, modules)
  const adminId = await userInsert(t, "admin")
  const ownerId = await userInsert(t, "user")
  const guestAccessToken = "readbounds_guest_access_token_00000001"
  const digest = await ticketAccessDigestCreate(guestAccessToken)
  if (!digest.success) throw new Error(digest.errorMessage)
  const orderId = await t.run(async (ctx) =>
    ctx.db.insert(
      "ticketOrders",
      orderInput("overflow", {
        ownerUserId: ownerId,
        emailAccessDigest: digest.data,
      }),
    ),
  )
  await orderDetailsInsert(t, orderId, ticketMaxPerOrder + 1)
  const adminResult = await t.query(api.ticketing.ticketOrderGetAdminQuery, {
    token: await testAuthSessionTokenCreate(t, adminId, authSecret),
    orderId,
  })
  expect(adminResult.success).toBe(true)
  if (adminResult.success) expect(adminResult.data.lines).toHaveLength(ticketMaxPerOrder + 1)
  const fulfillmentResult = await t.run(async (ctx) => ticketFulfillmentWorkSnapshotCreate(ctx, orderId, "billing"))
  expect(fulfillmentResult.success).toBe(true)
  if (fulfillmentResult.success) expect(fulfillmentResult.data.tickets).toHaveLength(ticketMaxPerOrder + 1)
  const ownerResult = await t.query(api.ticketing.ticketOrderGetQuery, {
    orderId,
    token: await testAuthSessionTokenCreate(t, ownerId, authSecret),
  })
  const guestResult = await t.query(api.ticketing.ticketOrderByAccessTokenQuery, { guestAccessToken })
  for (const result of [ownerResult, guestResult]) {
    expect(result).toMatchObject({
      success: true,
      data: {
        lines: Array.from({ length: ticketMaxPerOrder + 1 }, () => expect.objectContaining({ quantity: 1 })),
        tickets: Array.from({ length: ticketMaxPerOrder + 1 }, (_, index) =>
          expect.objectContaining({ sequence: index + 1 }),
        ),
      },
    })
  }
})

test("fulfillment still rejects missing tickets and invalid immutable checkout or legal snapshots", async () => {
  const t = convexTest(schema, modules)
  const orderId = await t.run(async (ctx) => ctx.db.insert("ticketOrders", orderInput("invalid-snapshot")))
  const empty = await t.run(async (ctx) => ticketFulfillmentWorkSnapshotCreate(ctx, orderId, "billing"))
  expect(empty).toMatchObject({ success: false, errorMessage: "The paid order has no issued tickets" })
  await orderDetailsInsert(t, orderId, 1)
  await t.run(async (ctx) => ctx.db.patch(orderId, { checkoutContextJson: "{}" }))
  const invalid = await t.run(async (ctx) => ticketFulfillmentWorkSnapshotCreate(ctx, orderId, "billing"))
  expect(invalid).toMatchObject({ success: false, errorMessage: "The order locale snapshot is invalid" })
  await t.run(async (ctx) =>
    ctx.db.patch(orderId, {
      checkoutContextJson: orderInput("valid").checkoutContextJson,
      legalTermsMarkdown: undefined,
    }),
  )
  const missing = await t.run(async (ctx) => ticketFulfillmentWorkSnapshotCreate(ctx, orderId, "billing"))
  expect(missing).toMatchObject({ success: false, errorMessage: "The order has no immutable legal snapshot" })
})

function timestamp(index: number) {
  return new Date(now - 1_000_000 + index * 1000).toISOString()
}

function orderInput(paymentReference: string, overrides: Partial<OrderInput> = {}): OrderInput {
  return {
    checkoutKey: paymentReference,
    customerEmail: "customer@example.test",
    contactSnapshotJson: "{}",
    eventKey: "event",
    eventTitle: "Event",
    eventSubtitle: "",
    eventDescription: "",
    eventStartsAt: "2026-11-01T18:00:00.000Z",
    eventEndsAt: future,
    eventDoorsAt: "2026-11-01T17:00:00.000Z",
    venue: "Hall",
    city: "Berlin",
    address: "Street 1",
    organizer: "Eventoren",
    imageUrl: "",
    imageAlt: "",
    catalogVersion: 1,
    subtotalCents: 1000,
    feeCents: 100,
    totalCents: 1100,
    checkoutContextJson: JSON.stringify({ locale: "de", legalContext: { cta: "Kostenpflichtig buchen" } }),
    legalDocumentSetRevision: "immutable-revision",
    legalTermsMarkdown: "Immutable terms",
    legalPrivacyMarkdown: "Immutable privacy",
    paymentReference,
    stripeMode: "test",
    status: "paid",
    paymentStatus: "paid",
    reservationExpiresAt: now,
    createdAt: timestamp(0),
    updatedAt: timestamp(0),
    ...overrides,
  }
}

async function userInsert(t: TestContext, role: "admin" | "user") {
  return t.run(async (ctx) =>
    ctx.db.insert("users", { name: role, role, createdAt: timestamp(0), updatedAt: timestamp(0) }),
  )
}

async function orderDetailsInsert(t: TestContext, orderId: Id<"ticketOrders">, count: number) {
  await t.run(async (ctx) => {
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey: `event-${orderId}`,
      title: "Event",
      subtitle: "",
      description: "",
      category: "Test",
      startsAt: "2026-11-01T18:00:00.000Z",
      endsAt: future,
      doorsAt: "2026-11-01T17:00:00.000Z",
      venue: "Hall",
      city: "Berlin",
      address: "Street 1",
      organizer: "Eventoren",
      imageUrl: "",
      imageAlt: "",
      tags: [],
      status: "published",
      catalogVersion: 1,
      createdAt: timestamp(0),
      updatedAt: timestamp(0),
    })
    const tierId = await ctx.db.insert("catalogTicketTiers", {
      eventId,
      tierKey: "tier",
      name: "Tier",
      description: "",
      priceCents: 1000,
      feeCents: 100,
      capacity: 100,
      reserved: 0,
      sold: count,
      sortOrder: 1,
      catalogVersion: 1,
      createdAt: timestamp(0),
      updatedAt: timestamp(0),
    })
    for (let index = 1; index <= count; index++) {
      await ctx.db.insert("ticketOrderLines", {
        orderId,
        tierId,
        eventKey: "event",
        tierKey: `tier-${index}`,
        tierName: `Tier ${index}`,
        tierDescription: "",
        quantity: 1,
        priceCents: 1000,
        feeCents: 100,
        createdAt: timestamp(index),
      })
      const sequence = count + 1 - index
      await ctx.db.insert("ticketIssued", {
        orderId,
        sequence,
        code: `ticket-${orderId}-${sequence}`,
        eventKey: "event",
        eventTitle: "Event",
        eventStartsAt: "2026-11-01T18:00:00.000Z",
        eventDoorsAt: "2026-11-01T17:00:00.000Z",
        venue: "Hall",
        city: "Berlin",
        address: "Street 1",
        tierKey: `tier-${sequence}`,
        tierName: `Tier ${sequence}`,
        priceCents: 1000,
        feeCents: 100,
        participantName: `Participant ${sequence}`,
        issuedAt: timestamp(index),
      })
    }
  })
}
