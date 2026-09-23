/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.ts"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "ticketing-convex-test-secret"
process.env.AUTH_SECRET = authSecret

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  delete process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST
})

async function createUser(t: ReturnType<typeof convexTest>, role: "admin" | "user" = "user") {
  const now = new Date().toISOString()
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: role,
      role,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function tokenFor(userId: string) {
  return await createToken(userId, authSecret)
}

function billingMock(
  payment: "pending" | "paid" | "failed" = "pending",
  expirationPayment: "pending" | "paid" | "failed" | "expired" = "expired",
) {
  let checkoutCalls = 0
  let fulfillmentCalls = 0
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    let paymentReference = "payment_checkoutkey123456789012345678901234"
    if (typeof init?.body === "string") {
      try {
        const body = JSON.parse(init.body) as { paymentReference?: unknown }
        if (typeof body.paymentReference === "string") paymentReference = body.paymentReference
      } catch {
        // The test mock only needs the payment reference when the request body is valid JSON.
      }
    }
    if (url.includes("/expire")) {
      const pathParts = url.split("/")
      const referencePart = pathParts.at(-2)
      if (referencePart) paymentReference = decodeURIComponent(referencePart)
    }
    if (url.endsWith("/catalog"))
      return new Response(
        JSON.stringify({
          success: true,
          data: { catalogVersion: 3, catalogDigest: "a".repeat(64), eventCount: 1, replayed: false },
        }),
        { status: 200 },
      )
    if (url.endsWith("/ticket-checkout")) {
      checkoutCalls += 1
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
    if (url.endsWith("/ticket-fulfillment")) {
      fulfillmentCalls += 1
      let body: { orderReference?: string; paymentReference?: string } = {}
      try {
        body = JSON.parse(String(init?.body)) as typeof body
      } catch {
        // The fulfillment assertion below only needs the stable correlation fields.
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            orderReference: body.orderReference ?? "order_billing1",
            paymentReference: body.paymentReference ?? paymentReference,
            fulfillmentReference: `fulfillment_${fulfillmentCalls}`,
            status: "accepted",
            replayed: fulfillmentCalls > 1,
          },
        }),
        { status: 200 },
      )
    }
    if (url.includes("/expire"))
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference,
            orderReference: "order_billing1",
            stripeMode: "test",
            status:
              expirationPayment === "expired"
                ? "expired"
                : expirationPayment === "failed"
                  ? "failed"
                  : "checkout_created",
            payment: expirationPayment,
            expiresAt: null,
          },
        }),
        { status: 200 },
      )
    if (url.includes("/status"))
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference: decodeURIComponent(url.split("/").at(-2) ?? paymentReference),
            orderReference: "order_billing1",
            stripeMode: "test",
            status: payment === "failed" ? "failed" : payment === "pending" ? "checkout_created" : "checkout_created",
            payment,
            expiresAt: null,
          },
        }),
        { status: 200 },
      )
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { fetchMock, checkoutCallsGet: () => checkoutCalls, fulfillmentCallsGet: () => fulfillmentCalls }
}

async function seedCatalog(t: ReturnType<typeof convexTest>, token: string) {
  const event = await t.mutation(api.catalog.catalogEventUpsertMutation, {
    eventKey: "ticket-event",
    title: "Ticket event",
    subtitle: "Subtitle",
    description: "Description",
    category: "konzerte",
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Hall",
    city: "Berlin",
    address: "Street 1",
    organizer: "Eventoren",
    imageUrl: "https://eventoren.test/image.jpg",
    imageAlt: "Stage",
    tags: [],
    token,
  })
  expect(event.success).toBe(true)
  await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "ticket-event",
    tierKey: "standard",
    name: "Standard",
    description: "Ticket",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 2_500,
    feeCents: 300,
    capacity: 2,
    token,
  })
  const published = await t.mutation(api.catalog.catalogEventPublishMutation, {
    eventKey: "ticket-event",
    token,
  })
  expect(published.success).toBe(true)
  if (!published.success) throw new Error("catalog seed failed")
  return published.data.catalogVersion
}

function checkoutArgs(
  token: string,
  catalogVersion: number,
  checkoutKey: string,
  options: {
    eventKey?: string
    tickets?: { tierKey: string; quantity: number; participantNames?: string[] }[]
    customer?: { email?: string; givenName?: string; familyName?: string; phone?: string }
  } = {},
) {
  return {
    token,
    checkoutKey,
    eventKey: options.eventKey ?? "ticket-event",
    catalogVersion,
    tickets: options.tickets ?? [{ tierKey: "standard", quantity: 1, participantNames: ["Ada Lovelace"] }],
    successUrl: "https://eventoren.test/checkout/success",
    cancelUrl: "https://eventoren.test/checkout/cancel",
    locale: "de" as const,
    customer: {
      email: options.customer?.email ?? "buyer@example.com",
      givenName: options.customer?.givenName ?? "Ada",
      familyName: options.customer?.familyName ?? "Lovelace",
      phone: options.customer?.phone ?? "",
    },
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
  }
}

async function insertOrderHistoryOrder(
  t: ReturnType<typeof convexTest>,
  ownerUserId: Id<"users">,
  index: number,
  createdAt: string,
  detailTierId?: Id<"catalogTicketTiers">,
  withDetails = false,
) {
  return await t.run(async (ctx) => {
    const orderId = await ctx.db.insert("ticketOrders", {
      checkoutKey: `history-checkout-${index}`,
      ownerUserId,
      customerEmail: `history-${index}@example.com`,
      customerGivenName: "History",
      customerFamilyName: `Order ${index}`,
      customerPhone: "+491234567890",
      contactSnapshotJson: JSON.stringify({ email: `history-${index}@example.com` }),
      eventKey: `history-event-${index}`,
      eventTitle: `History event ${index}`,
      eventSubtitle: "Order history test event",
      eventDescription: "This description belongs to the detail endpoint.",
      eventStartsAt: "2026-11-01T18:00:00.000Z",
      eventEndsAt: "2026-11-01T22:00:00.000Z",
      eventDoorsAt: "2026-11-01T17:00:00.000Z",
      venue: "History Hall",
      city: "Berlin",
      address: "History Street 1",
      organizer: "Eventoren",
      imageUrl: "https://eventoren.test/history.jpg",
      imageAlt: "History event",
      catalogVersion: 1,
      subtotalCents: 2_500,
      feeCents: 300,
      totalCents: 2_800,
      checkoutContextJson: JSON.stringify({ source: "test" }),
      paymentReference: `history-payment-${index}`,
      stripeMode: "test",
      status: "paid",
      paymentStatus: "paid",
      reservationExpiresAt: Date.now() + 60_000,
      createdAt,
      updatedAt: createdAt,
      paidAt: createdAt,
    })
    if (withDetails) {
      await ctx.db.insert("ticketOrderLines", {
        orderId,
        tierId: detailTierId as Id<"catalogTicketTiers">,
        eventKey: `history-event-${index}`,
        tierKey: "standard",
        tierName: "Standard",
        tierDescription: "Standard ticket",
        quantity: 1,
        priceCents: 2_500,
        feeCents: 300,
        createdAt,
      })
      await ctx.db.insert("ticketIssued", {
        orderId,
        sequence: 1,
        ownerUserId,
        code: `HISTORY-TICKET-${index}`,
        eventKey: `history-event-${index}`,
        eventTitle: `History event ${index}`,
        eventStartsAt: "2026-11-01T18:00:00.000Z",
        eventDoorsAt: "2026-11-01T17:00:00.000Z",
        venue: "History Hall",
        city: "Berlin",
        address: "History Street 1",
        tierKey: "standard",
        tierName: "Standard",
        priceCents: 2_500,
        feeCents: 300,
        issuedAt: createdAt,
      })
    }
    return orderId
  })
}

function environmentSet() {
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
}

test("reserves atomically and replays the same checkout without a second Billing session", async () => {
  environmentSet()
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey123456789012345678901234")

  const first = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  const replay = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  const competing = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...args,
    checkoutKey: "checkoutkey223456789012345678901234",
    tickets: [{ tierKey: "standard", quantity: 2, participantNames: ["Ada Lovelace", "Grace Hopper"] }],
  })

  expect(first.success).toBe(true)
  expect(first).toMatchObject({ success: true, data: { fulfillmentEligible: false } })
  expect(replay).toMatchObject({ success: true, data: { replayed: true, status: "checkout_created" } })
  expect(competing.success).toBe(false)
  expect(billing.checkoutCallsGet()).toBe(1)
  const inventory = await t.run(async (ctx) => {
    const tier = await ctx.db.query("catalogTicketTiers").collect()
    const orders = await ctx.db.query("ticketOrders").collect()
    const reservations = await ctx.db.query("ticketReservations").collect()
    return { tier, orders, reservations }
  })
  expect(inventory.tier[0]?.reserved).toBe(1)
  expect(inventory.orders).toHaveLength(1)
  expect(inventory.reservations).toHaveLength(1)
  expect(billing.fetchMock).toHaveBeenCalled()
})

test("persists enabled fulfillment eligibility once and replays it after the allowlist changes", async () => {
  environmentSet()
  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = "eventoren-test"
  billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey323456789012345678901234")

  const first = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(first).toMatchObject({ success: true, data: { fulfillmentEligible: true, replayed: false } })
  if (!first.success) return
  const stored = await t.run(async (ctx) => ctx.db.get(first.data.orderId as Id<"ticketOrders">))
  expect(stored).toMatchObject({
    fulfillmentEligible: true,
    legalDocumentSetRevision: ticketCheckoutLegalDocumentRevision,
    legalTermsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
    legalPrivacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
  })

  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = ""
  const replay = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(replay).toMatchObject({ success: true, data: { fulfillmentEligible: true, replayed: true } })
})

test("requires the generated current legal revision only for a newly enabled checkout", async () => {
  environmentSet()
  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = "eventoren-test"
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))

  const result = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey423456789012345678901234"),
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true,
      privacyAcknowledged: true,
      documentSetRevision: `sha256:${"a".repeat(64)}`,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
  })

  expect(result).toMatchObject({ success: false, errorMessage: "The accepted legal snapshot is not current" })
  expect(billing.checkoutCallsGet()).toBe(0)
  expect(await t.run(async (ctx) => ctx.db.query("ticketOrders").collect())).toHaveLength(0)
})

test("requires the exact accepted legal Markdown snapshot for a newly enabled checkout", async () => {
  environmentSet()
  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = "eventoren-test"
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey823456789012345678901234")

  const result = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...args,
    legalContext: {
      ...args.legalContext,
      termsMarkdown: "stale legal terms",
    },
  })

  expect(result).toMatchObject({ success: false, errorMessage: "The accepted legal snapshot is not current" })
  expect(billing.checkoutCallsGet()).toBe(0)
})

test("defaults missing legacy fulfillment eligibility to false without reevaluating the current switch", async () => {
  environmentSet()
  delete process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "legacycheckout123456789012345678901234")
  const first = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(first).toMatchObject({ success: true, data: { fulfillmentEligible: false } })
  if (!first.success) return
  await t.run(async (ctx) => {
    const order = await ctx.db.get(first.data.orderId as Id<"ticketOrders">)
    const context = JSON.parse(order?.checkoutContextJson ?? "{}") as { legalContext?: Record<string, unknown> }
    const legalContext = { ...(context.legalContext ?? {}) }
    delete legalContext.termsMarkdown
    delete legalContext.privacyMarkdown
    context.legalContext = legalContext
    await ctx.db.patch(first.data.orderId as Id<"ticketOrders">, {
      checkoutContextJson: JSON.stringify(context),
      fulfillmentEligible: undefined,
      legalDocumentSetRevision: undefined,
      legalTermsMarkdown: undefined,
      legalPrivacyMarkdown: undefined,
    })
  })

  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = "eventoren-test"

  const replay = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(replay).toMatchObject({
    success: true,
    data: { status: "checkout_created", fulfillmentEligible: false, replayed: true },
  })
  expect(billing.checkoutCallsGet()).toBe(1)
})

test("requires participant names for every newly checked-out ticket", async () => {
  environmentSet()
  billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))

  const result = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey523456789012345678901234"),
    tickets: [{ tierKey: "standard", quantity: 1 }],
  })

  expect(result).toMatchObject({ success: false, errorMessage: "Each ticket requires exactly one participant name" })
  const orders = await t.run(async (ctx) => ctx.db.query("ticketOrders").collect())
  expect(orders).toHaveLength(0)
})

test("rejects checkout orders whose total ticket quantity exceeds the order maximum", async () => {
  environmentSet()
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const adminToken = await tokenFor(adminId)
  await seedCatalog(t, adminToken)
  const addedTier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "ticket-event",
    tierKey: "vip",
    name: "VIP",
    description: "VIP ticket",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 4_000,
    feeCents: 500,
    capacity: 20,
    token: adminToken,
  })
  expect(addedTier.success).toBe(true)
  if (!addedTier.success) return

  const result = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...checkoutArgs(await tokenFor(userId), addedTier.data.catalogVersion, "checkoutkey923456789012345678901234"),
    tickets: [
      { tierKey: "standard", quantity: 2, participantNames: ["Ada", "Grace"] },
      {
        tierKey: "vip",
        quantity: 9,
        participantNames: ["Lin", "Max", "Noah", "Oskar", "Pia", "Quinn", "Ruth", "Sven", "Tara"],
      },
    ],
  })

  expect(result).toMatchObject({ success: false, errorMessage: "The maximum number of tickets per order is 10" })
  expect(billing.checkoutCallsGet()).toBe(0)
  const inventory = await t.run(async (ctx) => {
    const orders = await ctx.db.query("ticketOrders").collect()
    const reservations = await ctx.db.query("ticketReservations").collect()
    const tiers = await ctx.db.query("catalogTicketTiers").collect()
    return { orders, reservations, tiers }
  })
  expect(inventory.orders).toHaveLength(0)
  expect(inventory.reservations).toHaveLength(0)
  expect(inventory.tiers.every((tier) => tier.reserved === 0)).toBe(true)
})

test("rejects checkout return URLs outside the configured Eventoren origin", async () => {
  environmentSet()
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))

  const result = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey623456789012345678901234"),
    successUrl: "https://alternate.example.test/checkout/success",
  })

  expect(result).toMatchObject({
    success: false,
    errorMessage: "Checkout return URLs must use the configured Eventoren origin",
  })
  expect(billing.checkoutCallsGet()).toBe(0)
  const orders = await t.run(async (ctx) => ctx.db.query("ticketOrders").collect())
  expect(orders).toHaveLength(0)
})

test("canonicalizes same-origin checkout return URLs before persistence", async () => {
  environmentSet()
  billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))

  const result = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey723456789012345678901234"),
    successUrl: "https://eventoren.test:443/checkout/success?result=paid#complete",
    cancelUrl: "https://eventoren.test:443/checkout/cancel?result=cancelled",
  })

  expect(result.success).toBe(true)
  const orders = await t.run(async (ctx) => ctx.db.query("ticketOrders").collect())
  expect(orders).toHaveLength(1)
  expect(JSON.parse(orders[0]?.checkoutContextJson ?? "{}")).toMatchObject({
    successUrl: "https://eventoren.test/checkout/success?result=paid#complete",
    cancelUrl: "https://eventoren.test/checkout/cancel?result=cancelled",
  })
})

test("does not release a still-payable pending session, then issues exactly once after Billing paid", async () => {
  environmentSet()
  const billing = billingMock("pending")
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey123456789012345678901234")
  const checkout = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(checkout.success).toBe(true)
  if (!checkout.success) return

  const pending = await t.action(api.ticketing.ticketPaymentReconcileAction, {
    orderId: checkout.data.orderId as never,
    token: args.token,
  })
  expect(pending).toMatchObject({ success: true, data: { paymentStatus: "pending" } })
  const pendingInventory = await t.run(async (ctx) => ctx.db.query("catalogTicketTiers").collect())
  expect(pendingInventory[0]?.reserved).toBe(1)

  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/status"))
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference: "payment_checkoutkey123456789012345678901234",
            orderReference: "order_billing1",
            stripeMode: "test",
            status: "failed",
            payment: "paid",
            expiresAt: null,
          },
        }),
        { status: 200 },
      )
    return billing.fetchMock(input)
  })
  const paid = await t.action(api.ticketing.ticketPaymentReconcileAction, {
    orderId: checkout.data.orderId as never,
    token: args.token,
  })
  const replayedPaid = await t.action(api.ticketing.ticketPaymentReconcileAction, {
    orderId: checkout.data.orderId as never,
    token: args.token,
  })
  expect(paid).toMatchObject({ success: true, data: { status: "paid", ticketCount: 1 } })
  expect(replayedPaid).toMatchObject({ success: true, data: { status: "paid", ticketCount: 1 } })
  const finalInventory = await t.run(async (ctx) => {
    const tier = await ctx.db.query("catalogTicketTiers").collect()
    const tickets = await ctx.db.query("ticketIssued").collect()
    return { tier, tickets }
  })
  expect(finalInventory.tier[0]).toMatchObject({ reserved: 0, sold: 1 })
  expect(finalInventory.tickets).toHaveLength(1)
})

test("keeps participant names through paid retries and serves order QR codes through revocable guest access", async () => {
  environmentSet()
  billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const adminToken = await tokenFor(adminId)
  await seedCatalog(t, adminToken)
  const addedTier = await t.mutation(api.catalog.catalogTicketTierUpsertMutation, {
    eventKey: "ticket-event",
    tierKey: "vip",
    name: "VIP",
    description: "VIP ticket",
    startsAt: "2026-10-01T18:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    priceCents: 4_000,
    feeCents: 500,
    capacity: 2,
    token: adminToken,
  })
  expect(addedTier.success).toBe(true)
  if (!addedTier.success) return

  const checkoutKey = "checkoutkey423456789012345678901234"
  const args = checkoutArgs(await tokenFor(userId), addedTier.data.catalogVersion, checkoutKey, {
    tickets: [
      { tierKey: "standard", quantity: 2, participantNames: ["Ada", "Grace"] },
      { tierKey: "vip", quantity: 1, participantNames: ["Lin"] },
    ],
  })
  const checkout = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(checkout).toMatchObject({ success: true, data: { status: "checkout_created" } })
  if (!checkout.success) return
  // Checkout itself has no emailed access capability; paid ticket issuance creates it.
  expect(await t.run(async (ctx) => ctx.db.query("ticketOrderDeliveries").collect())).toHaveLength(0)

  const changedReplay = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...args,
    tickets: [
      { tierKey: "standard", quantity: 2, participantNames: ["Ada", "Changed"] },
      { tierKey: "vip", quantity: 1, participantNames: ["Lin"] },
    ],
  })
  expect(changedReplay.success).toBe(false)

  const reserved = await t.run(async (ctx) => {
    const lines = await ctx.db.query("ticketOrderLines").collect()
    const reservations = await ctx.db.query("ticketReservations").collect()
    const order = await ctx.db.get(checkout.data.orderId as never)
    return { lines, reservations, order }
  })
  expect(reserved.lines.map((line) => line.participantNamesJson)).toEqual([
    JSON.stringify(["Ada", "Grace"]),
    JSON.stringify(["Lin"]),
  ])
  expect(reserved.reservations.map((reservation) => reservation.participantNamesJson)).toEqual([
    JSON.stringify(["Ada", "Grace"]),
    JSON.stringify(["Lin"]),
  ])
  expect(reserved.order).toMatchObject({ customerGivenName: "Ada", customerFamilyName: "Lovelace" })

  const paid = await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
    orderId: checkout.data.orderId as never,
    paymentReference: `payment_${checkoutKey}`,
    billingOrderReference: "order_billing1",
    stripeMode: "test",
    payment: "paid",
  })
  const paidRetry = await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
    orderId: checkout.data.orderId as never,
    paymentReference: `payment_${checkoutKey}`,
    billingOrderReference: "order_billing1",
    stripeMode: "test",
    payment: "paid",
  })
  expect(paid).toMatchObject({ success: true, data: { status: "paid", ticketCount: 3 } })
  expect(paidRetry).toMatchObject({ success: true, data: { status: "paid", ticketCount: 3 } })

  const tickets = await t.run(async (ctx) =>
    (await ctx.db.query("ticketIssued").collect()).sort((left, right) => left.sequence - right.sequence),
  )
  expect(tickets).toHaveLength(3)
  expect(tickets.map((ticket) => [ticket.tierKey, ticket.participantName])).toEqual([
    ["standard", "Ada"],
    ["standard", "Grace"],
    ["vip", "Lin"],
  ])

  const wallet = await t.query(api.ticketing.ticketOrderGetQuery, {
    orderId: checkout.data.orderId as never,
    token: args.token,
  })
  expect(wallet).toMatchObject({
    success: true,
    data: {
      contact: { givenName: "Ada", familyName: "Lovelace" },
      tickets: [{ participantName: "Ada" }, { participantName: "Grace" }, { participantName: "Lin" }],
    },
  })

  const capability = await t.run(async (ctx) => {
    const delivery = await ctx.db.query("ticketOrderDeliveries").collect()
    const order = await ctx.db.get(checkout.data.orderId as never)
    return { delivery: delivery[0], order }
  })
  expect(capability.delivery?.accessTokenSnapshot).toMatch(/^[A-Za-z0-9_-]{32,256}$/u)
  expect(capability.order?.emailAccessDigest).toMatch(/^[a-f0-9]{64}$/u)
  if (!capability.delivery) return

  const link = await t.mutation(internal.ticketing.ticketOrderAccessCapabilityEnsureMutation, {
    orderId: checkout.data.orderId as never,
    publicBaseUrl: "https://tickets.example",
  })
  expect(link).toMatchObject({
    success: true,
    data: {
      accessUrl: `https://tickets.example/checkout#ticketAccess=${capability.delivery.accessTokenSnapshot}`,
      replayed: true,
    },
  })
  if (!link.success) return
  const guestAccessToken = decodeURIComponent(new URL(link.data.accessUrl).hash.slice("#ticketAccess=".length))

  // No user token is supplied: the emailed guest capability alone returns the order's QR payload.
  const emailWallet = await t.query(api.ticketing.ticketOrderByAccessTokenQuery, {
    guestAccessToken,
  })
  expect(emailWallet.success).toBe(true)
  if (emailWallet.success) {
    expect(emailWallet.data.tickets.map((ticket) => ticket.participantName)).toEqual(["Ada", "Grace", "Lin"])
    expect(emailWallet.data.tickets.map((ticket) => ticket.code)).toEqual(tickets.map((ticket) => ticket.code))
  }
  const invalidEmailWallet = await t.query(api.ticketing.ticketOrderByAccessTokenQuery, {
    guestAccessToken: `${guestAccessToken.slice(0, -1)}x`,
  })
  expect(invalidEmailWallet.success).toBe(false)

  const otherOrderId = await t.run(async (ctx) => {
    const order = await ctx.db.get(checkout.data.orderId as never)
    if (!order) throw new Error("paid order is missing")
    const { _id: _ignoredId, _creationTime: _ignoredCreationTime, ...snapshot } = order
    return await ctx.db.insert("ticketOrders", {
      ...snapshot,
      checkoutKey: "othercheckoutkey423456789012345678901234",
      paymentReference: "payment_other_order",
      emailAccessDigest: undefined,
      emailAccessRevokedAt: undefined,
    })
  })
  const crossOrder = await t.query(api.ticketing.ticketOrderGetQuery, {
    orderId: otherOrderId,
    guestAccessToken,
  })
  expect(crossOrder.success).toBe(false)

  const revoked = await t.mutation(internal.ticketing.ticketOrderAccessCapabilityRevokeMutation, {
    orderId: checkout.data.orderId as never,
  })
  expect(revoked.success).toBe(true)
  const revokedEmailWallet = await t.query(api.ticketing.ticketOrderByAccessTokenQuery, {
    guestAccessToken,
  })
  expect(revokedEmailWallet.success).toBe(false)
})

test("reconciles a paid close-tab checkout and prepares one immutable fulfillment request", async () => {
  vi.useFakeTimers()
  environmentSet()
  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = "eventoren-test"
  const billing = billingMock("paid")
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const checkout = await t.action(
    api.ticketing.ticketCheckoutCreateAction,
    checkoutArgs(
      await tokenFor(userId),
      await seedCatalog(t, await tokenFor(adminId)),
      "checkoutkey523456789012345678901234",
    ),
  )
  expect(checkout).toMatchObject({ success: true, data: { fulfillmentEligible: true } })
  if (!checkout.success) return

  const reconciled = await t.action(internal.ticketing.ticketPaymentReconcileScheduledAction, {})
  expect(reconciled).toMatchObject({ success: true, data: { checked: 1 } })
  await t.finishAllScheduledFunctions(vi.runAllTimers)
  await t.run(async (ctx) => {
    const work = await ctx.db.query("ticketFulfillmentWork").first()
    if (work) await ctx.db.patch("ticketFulfillmentWork", work._id, { leaseUntil: 0, nextAttemptAt: 0 })
  })
  const replay = await t.action(internal.ticketing.ticketFulfillmentPrepareAction, {
    workId: await t.run(async (ctx) => {
      const work = await ctx.db.query("ticketFulfillmentWork").first()
      if (!work) throw new Error("fulfillment work was not created")
      return work._id
    }),
  })
  expect(replay.success).toBe(true)
  expect(billing.fulfillmentCallsGet()).toBeLessThanOrEqual(1)
  const state = await t.run(async (ctx) => {
    const work = await ctx.db.query("ticketFulfillmentWork").first()
    const deliveries = await ctx.db.query("ticketOrderDeliveries").collect()
    const tickets = await ctx.db.query("ticketIssued").collect()
    return { work, deliveries, tickets }
  })
  expect(state.work).toMatchObject({ attemptCount: 1 })
  expect(state.deliveries).toHaveLength(1)
  expect(state.tickets).toHaveLength(1)
})

test("retries fulfillment preparation without issuing another ticket or access token", async () => {
  environmentSet()
  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = "eventoren-test"
  const billing = billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const checkout = await t.action(
    api.ticketing.ticketCheckoutCreateAction,
    checkoutArgs(
      await tokenFor(userId),
      await seedCatalog(t, await tokenFor(adminId)),
      "checkoutkey623456789012345678901234",
    ),
  )
  expect(checkout.success).toBe(true)
  if (!checkout.success) return
  const paid = await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
    orderId: checkout.data.orderId as never,
    paymentReference: checkout.data.paymentReference,
    billingOrderReference: "order_billing1",
    stripeMode: "test",
    payment: "paid",
  })
  expect(paid).toMatchObject({ success: true, data: { status: "paid", ticketCount: 1 } })
  const workId = await t.run(async (ctx) => {
    const work = await ctx.db.query("ticketFulfillmentWork").first()
    if (!work) throw new Error("fulfillment work was not created")
    return work._id
  })
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/ticket-fulfillment")) return new Response("temporary", { status: 503 })
      return await billing.fetchMock(input, init)
    }),
  )
  const failed = await t.action(internal.ticketing.ticketFulfillmentPrepareAction, { workId })
  expect(failed).toMatchObject({ success: true, data: { retryAt: expect.any(Number) } })
  await t.run(async (ctx) => await ctx.db.patch(workId, { nextAttemptAt: 0, leaseUntil: 0 }))
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren-new.example"
  vi.stubGlobal("fetch", billing.fetchMock)
  const retried = await t.action(internal.ticketing.ticketFulfillmentPrepareAction, { workId })
  expect(retried).toMatchObject({ success: true, data: { prepared: true } })
  const state = await t.run(async (ctx) => {
    const work = await ctx.db.get(workId)
    const deliveries = await ctx.db.query("ticketOrderDeliveries").collect()
    const tickets = await ctx.db.query("ticketIssued").collect()
    return { work, deliveries, tickets }
  })
  expect(state.work).toMatchObject({ status: "prepared", attemptCount: 2 })
  expect(state.deliveries).toHaveLength(1)
  expect(state.tickets).toHaveLength(1)
  expect(billing.fulfillmentCallsGet()).toBe(1)
  const fulfillmentCall = billing.fetchMock.mock.calls.find(([input]) => String(input).includes("/ticket-fulfillment"))
  expect(fulfillmentCall?.[1]?.body).toContain("https://eventoren.test/checkout#ticketAccess=")
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
})

test("rejects a payment correlation mismatch without changing inventory", async () => {
  environmentSet()
  billingMock()
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const checkout = await t.action(
    api.ticketing.ticketCheckoutCreateAction,
    checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey123456789012345678901234"),
  )
  expect(checkout.success).toBe(true)
  if (!checkout.success) return
  const wrong = await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
    orderId: checkout.data.orderId as never,
    paymentReference: "payment_other",
    billingOrderReference: "order_billing1",
    stripeMode: "test",
    payment: "paid",
  })
  expect(wrong.success).toBe(false)
  const inventory = await t.run(async (ctx) => ctx.db.query("catalogTicketTiers").collect())
  expect(inventory[0]).toMatchObject({ reserved: 1, sold: 0 })
})

test("releases inventory only after Billing reports failed and keeps guest access capability private", async () => {
  environmentSet()
  billingMock("failed")
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const guestAccessToken = "guest_access_token_123456789012345678"
  const args = {
    ...checkoutArgs("", catalogVersion, "checkoutkey123456789012345678901234"),
    token: undefined,
    guestAccessToken,
  }
  const checkout = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(checkout.success).toBe(true)
  if (!checkout.success) return
  const guestOrder = await t.query(api.ticketing.ticketOrderGetQuery, {
    orderId: checkout.data.orderId as never,
    guestAccessToken,
  })
  expect(guestOrder).toMatchObject({ success: true, data: { status: "checkout_created" } })
  const failed = await t.action(api.ticketing.ticketPaymentReconcileAction, {
    orderId: checkout.data.orderId as never,
    guestAccessToken,
  })
  expect(failed).toMatchObject({ success: true, data: { status: "failed", paymentStatus: "failed" } })
  const inventory = await t.run(async (ctx) => {
    const tier = await ctx.db.query("catalogTicketTiers").collect()
    const reservations = await ctx.db.query("ticketReservations").collect()
    return { tier, reservations }
  })
  expect(inventory.tier[0]).toMatchObject({ reserved: 0, sold: 0 })
  expect(inventory.reservations[0]?.status).toBe("released")
})

test("paginates current-user order summaries by indexed creation order without leaking other users or details", async () => {
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const otherUserId = await createUser(t)
  const token = await tokenFor(userId)
  const otherToken = await tokenFor(otherUserId)
  await seedCatalog(t, await tokenFor(adminId))
  const detailTierId = await t.run(async (ctx) => {
    const tier = await ctx.db.query("catalogTicketTiers").first()
    if (!tier) throw new Error("test catalog tier is missing")
    return tier._id
  })
  const createdAt = [
    "2026-11-03T00:00:00.000Z",
    "2026-11-03T00:00:00.000Z",
    "2026-11-02T00:00:00.000Z",
    "2026-11-02T00:00:00.000Z",
    "2026-11-01T00:00:00.000Z",
  ]
  const orderIds = []
  for (const [index, timestamp] of createdAt.entries())
    orderIds.push(await insertOrderHistoryOrder(t, userId, index, timestamp, detailTierId, index === 0))
  const otherOrderId = await insertOrderHistoryOrder(t, otherUserId, 99, "2026-11-04T00:00:00.000Z", undefined)

  const pages = []
  let cursor: string | null = null
  while (true) {
    const response = await t.query(api.ticketing.ticketOrderListMinePaginatedQuery, {
      token,
      paginationOpts: { numItems: 2, cursor },
    })
    expect(response.success).toBe(true)
    if (!response.success) return
    pages.push(...response.data.page)
    if (response.data.isDone) break
    cursor = response.data.continueCursor
  }

  expect(pages).toHaveLength(orderIds.length)
  expect(new Set(pages.map((order) => order.id)).size).toBe(orderIds.length)
  expect(pages.map((order) => order.id)).toEqual(expect.arrayContaining(orderIds))
  expect(pages.some((order) => order.id === otherOrderId)).toBe(false)
  expect(pages.every((order) => !("lines" in order) && !("tickets" in order))).toBe(true)
  expect(
    pages.every((order, index) => {
      const previous = pages[index - 1]
      return index === 0 || (previous !== undefined && previous.createdAt >= order.createdAt)
    }),
  ).toBe(true)

  const otherResponse = await t.query(api.ticketing.ticketOrderListMinePaginatedQuery, {
    token: otherToken,
    paginationOpts: { numItems: 10, cursor: null },
  })
  expect(otherResponse).toMatchObject({ success: true, data: { page: [{ id: otherOrderId }] } })

  const unauthorizedResponse = await t.query(api.ticketing.ticketOrderListMinePaginatedQuery, {
    token: "not-a-valid-user-token",
    paginationOpts: { numItems: 2, cursor: null },
  })
  expect(unauthorizedResponse.success).toBe(false)

  const detailOrderId = orderIds[0]
  if (!detailOrderId) throw new Error("test order is missing")
  const detail = await t.query(api.ticketing.ticketOrderGetQuery, { orderId: detailOrderId, token })
  expect(detail).toMatchObject({
    success: true,
    data: { lines: [{ tierKey: "standard" }], tickets: [{ sequence: 1 }] },
  })
  if (!detail.success) return
  expect(detail.data.contact).toMatchObject({ givenName: "History", familyName: "Order 0" })
  expect(detail.data.tickets[0]?.participantName).toBeUndefined()
})

test("scheduled expiry calls authenticated Billing expiration, releases once, and is idempotent", async () => {
  vi.useFakeTimers()
  environmentSet()
  const billing = billingMock("pending", "expired")
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey123456789012345678901234")
  const checkout = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(checkout.success).toBe(true)
  if (!checkout.success) return

  await t.finishAllScheduledFunctions(vi.runAllTimers)
  const replay = await t.action(internal.ticketing.ticketReservationExpireAction, {
    orderId: checkout.data.orderId as never,
  })
  expect(replay).toMatchObject({ success: true, data: { action: "complete" } })
  const expirationCalls = billing.fetchMock.mock.calls.filter(([input]) => String(input).includes("/expire"))
  expect(expirationCalls).toHaveLength(1)
  expect(expirationCalls[0]?.[1]).toMatchObject({
    method: "POST",
    headers: { Authorization: "Bearer bapi_test" },
  })

  const state = await t.run(async (ctx) => {
    const order = await ctx.db.get(checkout.data.orderId as never)
    const tier = await ctx.db.query("catalogTicketTiers").collect()
    const reservations = await ctx.db.query("ticketReservations").collect()
    const tickets = await ctx.db.query("ticketIssued").collect()
    return { order, tier, reservations, tickets }
  })
  expect(state.order).toMatchObject({ status: "expired", paymentStatus: "expired" })
  expect(state.tier[0]).toMatchObject({ reserved: 0, sold: 0 })
  expect(state.reservations[0]?.status).toBe("released")
  expect(state.tickets).toHaveLength(0)
})

test("pending and provider errors retain inventory and schedule expiry retries", async () => {
  environmentSet()
  const billing = billingMock("pending", "pending")
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey123456789012345678901234")
  const checkout = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(checkout.success).toBe(true)
  if (!checkout.success) return

  const pending = await t.action(internal.ticketing.ticketReservationExpireAction, {
    orderId: checkout.data.orderId as never,
  })
  expect(pending).toMatchObject({ success: true, data: { action: "deferred" } })

  const providerErrorFetch = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("/expire")) return new Response(JSON.stringify({ success: false }), { status: 502 })
    return billing.fetchMock(input)
  })
  vi.stubGlobal("fetch", providerErrorFetch)
  const providerError = await t.action(internal.ticketing.ticketReservationExpireAction, {
    orderId: checkout.data.orderId as never,
  })
  expect(providerError).toMatchObject({ success: false })
  const state = await t.run(async (ctx) => {
    const order = await ctx.db.get(checkout.data.orderId as never)
    const tier = await ctx.db.query("catalogTicketTiers").collect()
    return { order, tier }
  })
  expect(state.order).toMatchObject({ status: "checkout_created", paymentStatus: "pending" })
  expect(state.tier[0]).toMatchObject({ reserved: 1, sold: 0 })
  expect(providerErrorFetch).toHaveBeenCalledWith(expect.stringContaining("/expire"), expect.anything())
})

test("paid expiration result issues once and late paid truth after release cannot oversell", async () => {
  environmentSet()
  billingMock("pending", "paid")
  const t = convexTest(schema, modules)
  const adminId = await createUser(t, "admin")
  const userId = await createUser(t)
  const catalogVersion = await seedCatalog(t, await tokenFor(adminId))
  const args = checkoutArgs(await tokenFor(userId), catalogVersion, "checkoutkey123456789012345678901234")
  const checkout = await t.action(api.ticketing.ticketCheckoutCreateAction, args)
  expect(checkout.success).toBe(true)
  if (!checkout.success) return

  const paid = await t.action(internal.ticketing.ticketReservationExpireAction, {
    orderId: checkout.data.orderId as never,
  })
  expect(paid).toMatchObject({ success: true, data: { status: "paid", ticketCount: 1 } })

  const secondBilling = billingMock("pending", "expired")
  vi.stubGlobal("fetch", secondBilling.fetchMock)
  const secondCheckout = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...args,
    checkoutKey: "checkoutkey223456789012345678901234",
  })
  expect(secondCheckout.success).toBe(true)
  if (!secondCheckout.success) return
  const expired = await t.action(internal.ticketing.ticketReservationExpireAction, {
    orderId: secondCheckout.data.orderId as never,
  })
  expect(expired).toMatchObject({ success: true, data: { expired: true, released: true } })
  const replacement = await t.action(api.ticketing.ticketCheckoutCreateAction, {
    ...args,
    checkoutKey: "checkoutkey323456789012345678901234",
  })
  expect(replacement.success).toBe(true)
  if (!replacement.success) return
  const latePaid = await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
    orderId: secondCheckout.data.orderId as never,
    paymentReference: "payment_checkoutkey223456789012345678901234",
    billingOrderReference: "order_billing1",
    stripeMode: "test",
    payment: "paid",
  })
  expect(latePaid).toMatchObject({ success: true, data: { status: "paid_inventory_conflict", ticketCount: 0 } })

  const state = await t.run(async (ctx) => {
    const tier = await ctx.db.query("catalogTicketTiers").collect()
    const tickets = await ctx.db.query("ticketIssued").collect()
    const orders = await ctx.db.query("ticketOrders").collect()
    return { tier, tickets, orders }
  })
  expect(state.tier[0]).toMatchObject({ reserved: 1, sold: 1 })
  expect(state.tickets).toHaveLength(1)
  expect(state.orders.find((order) => order._id === secondCheckout.data.orderId)).toMatchObject({
    status: "paid_inventory_conflict",
    paymentStatus: "paid",
  })
  expect(state.orders.find((order) => order._id === replacement.data.orderId)).toMatchObject({
    status: "checkout_created",
    paymentStatus: "pending",
  })
  expect(await t.run(async (ctx) => ctx.db.query("ticketFulfillmentWork").collect())).toHaveLength(0)
})
