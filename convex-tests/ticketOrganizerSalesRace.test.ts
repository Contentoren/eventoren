/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { api, internal } from "../convex/_generated/api.js"
import type { Id } from "../convex/_generated/dataModel.js"
import schema from "../convex/schema.js"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.ts"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const now = "2026-10-20T00:00:00.000Z"
const authSecret = "ticket-organizer-sales-race-secret"
process.env.AUTH_SECRET = authSecret

afterEach(() => {
  vi.unstubAllGlobals()
})

type SeedOptions = {
  orgStatus?: "pruefung" | "aktiv" | "gesperrt"
  configured?: boolean
  withOrganizationRow?: boolean
  withEventOrg?: boolean
  secondOrg?: boolean
}

async function raceSeed(options: SeedOptions = {}) {
  const t = convexTest(schema, modules)
  const seed = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Organizer sales race",
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version: 1,
      status: "synced",
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    const orgId = await ctx.db.insert("orgs", {
      orgHandle: "race-org",
      name: "Race Org",
      createdAt: now,
      updatedAt: now,
    })
    if (options.withOrganizationRow !== false) {
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId,
        status: options.orgStatus ?? "aktiv",
        profile: { name: "Race Org", slug: "race-org", kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        configurationConfirmed: options.configured ?? true,
        createdAt: now,
        updatedAt: now,
      })
    }
    let secondOrgId: Id<"orgs"> | undefined
    if (options.secondOrg === true) {
      secondOrgId = await ctx.db.insert("orgs", {
        orgHandle: "race-org-b",
        name: "Race Org B",
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert("organizerDashboardOrganizations", {
        orgId: secondOrgId,
        status: "aktiv",
        profile: { name: "Race Org B", slug: "race-org-b", kind: "verein" },
        tax: { status: "regel", defaultRateBps: 1900 },
        fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
        contracts: { termsAcceptedAt: now, dpaAcceptedAt: now },
        configurationConfirmed: true,
        createdAt: now,
        updatedAt: now,
      })
    }
    const eventId = await ctx.db.insert("catalogEvents", {
      eventKey: "organizer-race",
      title: "Race",
      subtitle: "",
      description: "",
      category: "konzerte",
      startsAt: now,
      endsAt: now,
      doorsAt: now,
      venue: "Hall",
      city: "Berlin",
      address: "Street",
      organizer: "Race Org",
      imageUrl: "https://example.com/image.jpg",
      imageAlt: "Stage",
      tags: [],
      status: "published",
      ...(options.withEventOrg !== false ? { orgId } : {}),
      catalogVersion: 1,
      eventRevision: 1,
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
      capacity: 100,
      reserved: 0,
      sold: 0,
      sortOrder: 0,
      catalogVersion: 1,
      createdAt: now,
      updatedAt: now,
    })
    return { userId, orgId, secondOrgId, eventId, tierId }
  })
  return { t, ...seed }
}

type RaceFixture = Awaited<ReturnType<typeof raceSeed>>

function prepareArgs(checkoutKey: string, paymentReference: string) {
  return {
    checkoutKey,
    customerEmail: "buyer@example.com",
    customerGivenName: "Ada",
    customerFamilyName: "Lovelace",
    customerAddress: "Street",
    customerPhone: "",
    eventKey: "organizer-race",
    catalogVersion: 1,
    eventRevision: 1,
    stripeMode: "test" as const,
    successUrl: "https://example.com/success",
    cancelUrl: "https://example.com/cancel",
    locale: "de" as const,
    paymentReference,
    fulfillmentEligible: true,
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
      privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
    },
    tickets: [{ tierKey: "standard", quantity: 1, participantNames: ["Ada Lovelace"] }],
  }
}

async function blockOrg(t: RaceFixture["t"], orgId: Id<"orgs">) {
  await t.run(async (ctx) => {
    const organization = await ctx.db
      .query("organizerDashboardOrganizations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .unique()
    await ctx.db.patch("organizerDashboardOrganizations", organization!._id, { status: "gesperrt" })
  })
}

async function orderAndAttemptRead(t: RaceFixture["t"], orderId: Id<"ticketOrders">) {
  return await t.run(async (ctx) => {
    const order = await ctx.db.get("ticketOrders", orderId)
    const attempt = order
      ? await ctx.db
          .query("ticketPaymentAttempts")
          .withIndex("paymentReference", (q) => q.eq("paymentReference", order.paymentReference))
          .unique()
      : null
    return { order, attempt }
  })
}

test("a block between Prepare and Claim denies the claim and takes no lock", async () => {
  const { t, orgId } = await raceSeed()
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-claim-blocked-checkout-key-01", "payment_race_claim_blocked_01"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  await blockOrg(t, orgId)
  const claimed = await t.mutation(internal.ticketing.ticketCheckoutClaimBillingMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_claim_blocked_01",
  })
  expect(claimed.success).toBe(false)
  const { order } = await orderAndAttemptRead(t, prepared.data.orderId)
  expect(order).toMatchObject({ status: "reserved", paymentStatus: "pending" })
  expect(order?.checkoutAttemptLeaseUntil).toBeUndefined()
})

test("a block between the provider reply and Mark persists identifiers but returns no pay URL", async () => {
  const { t, orgId } = await raceSeed()
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-mark-blocked-checkout-key-02", "payment_race_mark_blocked_02"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  // The Billing session already exists remotely at this point; the block
  // lands after the provider reply, before MarkCreated.
  await blockOrg(t, orgId)
  const marked = await t.mutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_mark_blocked_02",
    billingOrderReference: "billing_race_mark_blocked_02",
    checkoutUrl: "https://checkout.stripe.test/race-mark-blocked-02",
  })
  expect(marked.success).toBe(true)
  if (!marked.success) return
  expect(marked.data.salesAllowed).toBe(false)
  expect(marked.data.checkoutUrl).toBeUndefined()
  expect(marked.data).toMatchObject({
    billingOrderReference: "billing_race_mark_blocked_02",
    replayed: false,
  })
  const { order, attempt } = await orderAndAttemptRead(t, prepared.data.orderId)
  expect(order).toMatchObject({
    status: "checkout_created",
    paymentStatus: "pending",
    billingOrderReference: "billing_race_mark_blocked_02",
  })
  expect(order?.checkoutUrl).toBeUndefined()
  expect(attempt).toMatchObject({
    status: "checkout_created",
    billingOrderReference: "billing_race_mark_blocked_02",
  })
  expect(attempt?.checkoutUrl).toBeUndefined()
})

test("a blocked Mark replay suppresses the previously issued link without discarding it", async () => {
  const { t, orgId } = await raceSeed()
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-replay-blocked-checkout-key-03", "payment_race_replay_blocked_03"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  expect(
    await t.mutation(internal.ticketing.ticketCheckoutClaimBillingMutation, {
      orderId: prepared.data.orderId,
      paymentReference: "payment_race_replay_blocked_03",
    }),
  ).toMatchObject({ success: true })
  const first = await t.mutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_replay_blocked_03",
    billingOrderReference: "billing_race_replay_blocked_03",
    checkoutUrl: "https://checkout.stripe.test/race-replay-blocked-03",
  })
  expect(first).toMatchObject({ success: true, data: { salesAllowed: true, replayed: false } })
  await blockOrg(t, orgId)
  const replay = await t.mutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_replay_blocked_03",
    billingOrderReference: "billing_race_replay_blocked_03",
    checkoutUrl: "https://checkout.stripe.test/race-replay-blocked-03",
  })
  expect(replay.success).toBe(true)
  if (!replay.success) return
  expect(replay.data.salesAllowed).toBe(false)
  expect(replay.data.checkoutUrl).toBeUndefined()
  expect(replay.data.replayed).toBe(true)
  const { order } = await orderAndAttemptRead(t, prepared.data.orderId)
  expect(order).toMatchObject({
    status: "checkout_created",
    billingOrderReference: "billing_race_replay_blocked_03",
    checkoutUrl: "https://checkout.stripe.test/race-replay-blocked-03",
  })
})

test("buyer order reads suppress blocked unpaid URLs but preserve already-paid history", async () => {
  const { t, userId, orgId } = await raceSeed()
  const token = await testAuthSessionTokenCreate(t, userId, authSecret)
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-read-blocked-checkout-key-09", "payment_race_read_blocked_09"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  await t.run(async (ctx) => ctx.db.patch("ticketOrders", prepared.data.orderId, { ownerUserId: userId }))
  const checkoutUrl = "https://checkout.stripe.test/race-read-blocked-09"
  const marked = await t.mutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_read_blocked_09",
    billingOrderReference: "billing_race_read_blocked_09",
    checkoutUrl,
  })
  expect(marked).toMatchObject({ success: true, data: { salesAllowed: true, checkoutUrl } })
  const args = { token, orderId: prepared.data.orderId }
  expect(await t.query(api.ticketing.ticketOrderGetQuery, args)).toMatchObject({
    success: true,
    data: { checkoutUrl },
  })
  await blockOrg(t, orgId)
  const hidden = await t.query(api.ticketing.ticketOrderGetQuery, args)
  expect(hidden).toMatchObject({
    success: true,
    data: { id: prepared.data.orderId, status: "checkout_created", totalCents: 110 },
  })
  expect(JSON.stringify(hidden)).not.toContain(checkoutUrl)
  // The URL may already be known outside Eventoren. Suppression must not
  // erase the accepted payment or rewrite the historical financial snapshot.
  await t.run(async (ctx) =>
    ctx.db.patch("ticketOrders", prepared.data.orderId, {
      status: "paid",
      paymentStatus: "paid",
    }),
  )
  expect(await t.query(api.ticketing.ticketOrderGetQuery, args)).toMatchObject({
    success: true,
    data: { checkoutUrl, status: "paid", totalCents: 110 },
  })
})

test("an order snapshot that disagrees with the canonical event fails closed", async () => {
  const { t, eventId, secondOrgId } = await raceSeed({ secondOrg: true })
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-mismatch-checkout-key-04", "payment_race_mismatch_04"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  // Ownership transfer A -> B is unsupported: the canonical event must win
  // over the reservation-time snapshot, fail-closed.
  await t.run(async (ctx) => ctx.db.patch("catalogEvents", eventId, { orgId: secondOrgId }))
  const replay = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-mismatch-checkout-key-04", "payment_race_mismatch_04"),
  )
  expect(replay.success).toBe(false)
  const claimed = await t.mutation(internal.ticketing.ticketCheckoutClaimBillingMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_mismatch_04",
  })
  expect(claimed.success).toBe(false)
  if (claimed.success) return
  expect(claimed.errorMessage).toContain("conflicts")
  const { order } = await orderAndAttemptRead(t, prepared.data.orderId)
  expect(order?.checkoutAttemptLeaseUntil).toBeUndefined()
  const marked = await t.mutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_mismatch_04",
    billingOrderReference: "billing_race_mismatch_04",
    checkoutUrl: "https://checkout.stripe.test/race-mismatch-04",
  })
  expect(marked.success).toBe(true)
  if (!marked.success) return
  expect(marked.data.salesAllowed).toBe(false)
  expect(marked.data.checkoutUrl).toBeUndefined()
})

test("a deleted or unpublished canonical event fails closed at Claim", async () => {
  const { t, eventId } = await raceSeed()
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-gone-checkout-key-05", "payment_race_gone_05"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  await t.run(async (ctx) => ctx.db.patch("catalogEvents", eventId, { status: "archived" }))
  const claimed = await t.mutation(internal.ticketing.ticketCheckoutClaimBillingMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_gone_05",
  })
  expect(claimed.success).toBe(false)
  const { order } = await orderAndAttemptRead(t, prepared.data.orderId)
  expect(order?.checkoutAttemptLeaseUntil).toBeUndefined()
})

test("an unowned legacy checkout still passes Claim and Mark", async () => {
  const { t } = await raceSeed({ withEventOrg: false })
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-legacy-checkout-key-06", "payment_race_legacy_06"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  const claimed = await t.mutation(internal.ticketing.ticketCheckoutClaimBillingMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_legacy_06",
  })
  expect(claimed).toMatchObject({ success: true, data: { claimed: true } })
  const marked = await t.mutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_legacy_06",
    billingOrderReference: "billing_race_legacy_06",
    checkoutUrl: "https://checkout.stripe.test/race-legacy-06",
  })
  expect(marked).toMatchObject({
    success: true,
    data: {
      salesAllowed: true,
      replayed: false,
      checkoutUrl: "https://checkout.stripe.test/race-legacy-06",
    },
  })
})

test("money already paid still settles idempotently after the org is blocked", async () => {
  const { t, orgId } = await raceSeed()
  const prepared = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-paid-checkout-key-07", "payment_race_paid_07"),
  )
  expect(prepared.success).toBe(true)
  if (!prepared.success) return
  expect(
    await t.mutation(internal.ticketing.ticketCheckoutClaimBillingMutation, {
      orderId: prepared.data.orderId,
      paymentReference: "payment_race_paid_07",
    }),
  ).toMatchObject({ success: true })
  expect(
    await t.mutation(internal.ticketing.ticketCheckoutMarkCreatedMutation, {
      orderId: prepared.data.orderId,
      paymentReference: "payment_race_paid_07",
      billingOrderReference: "billing_race_paid_07",
      checkoutUrl: "https://checkout.stripe.test/race-paid-07",
    }),
  ).toMatchObject({ success: true, data: { salesAllowed: true } })
  const correlation = {
    orderId: prepared.data.orderId,
    paymentReference: "payment_race_paid_07",
    billingOrderReference: "billing_race_paid_07",
    stripeMode: "test" as const,
  }
  expect(
    await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
      ...correlation,
      payment: "paid",
      stripePaymentIntentStatus: "succeeded",
    }),
  ).toMatchObject({ success: true, data: { paymentStatus: "paid", ticketCount: 1 } })
  await blockOrg(t, orgId)
  // Paid replay stays ungated so settlement of accepted money keeps working.
  const replay = await t.mutation(
    internal.ticketing.ticketCheckoutPrepareMutation,
    prepareArgs("race-paid-checkout-key-07", "payment_race_paid_07"),
  )
  expect(replay).toMatchObject({ success: true, data: { status: "paid", paymentStatus: "paid", replayed: true } })
  expect(
    await t.mutation(internal.ticketing.ticketPaymentStatusApplyMutation, {
      ...correlation,
      payment: "paid",
      stripePaymentIntentStatus: "succeeded",
    }),
  ).toMatchObject({ success: true, data: { status: "paid", paymentStatus: "paid", ticketCount: 1 } })
  const { order } = await orderAndAttemptRead(t, prepared.data.orderId)
  expect(order).toMatchObject({ status: "paid", paymentStatus: "paid", orgId })
  expect(order?.cancellation).toBeUndefined()
  expect(order?.releasedAt).toBeUndefined()
})

function raceEnvironmentSet() {
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
}

/**
 * Billing fetch mock for the true finding-1 race: the mocked provider flips
 * the org to blocked while creating the session (i.e. between Claim and
 * Mark), then answers session creation and expiration per options.
 */
function raceBillingMock(t: RaceFixture["t"], orgId: Id<"orgs">, expireStatus: number) {
  let expireCalls = 0
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    let paymentReference = "payment_race_action_08"
    if (typeof init?.body === "string") {
      try {
        const body = JSON.parse(init.body) as { paymentReference?: unknown }
        if (typeof body.paymentReference === "string") paymentReference = body.paymentReference
      } catch {
        // The race mock only needs the payment reference for valid JSON bodies.
      }
    }
    if (url.includes("/expire")) {
      const referencePart = url.split("/").at(-2)
      if (referencePart) paymentReference = decodeURIComponent(referencePart)
    }
    if (url.endsWith("/ticket-checkout")) {
      // The block lands after Claim, before MarkCreated: exactly the
      // reviewed race window. Runs inside the provider call, so no real
      // network is ever touched.
      await blockOrg(t, orgId)
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference,
            orderReference: "order_billing_race_08",
            stripeMode: "test",
            status: "checkout_created",
            expiresAt: null,
            url: "https://checkout.stripe.test/race-action-08",
          },
        }),
        { status: 201 },
      )
    }
    if (url.includes("/expire")) {
      expireCalls += 1
      if (expireStatus !== 200) return new Response(null, { status: expireStatus })
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            paymentReference,
            orderReference: "order_billing_race_08",
            stripeMode: "test",
            status: "expired",
            payment: "expired",
            expiresAt: null,
          },
        }),
        { status: 200 },
      )
    }
    return new Response(null, { status: 404 })
  })
  vi.stubGlobal("fetch", fetchMock)
  return { fetchMock, expireCallsGet: () => expireCalls }
}

async function raceActionSeed() {
  const { t, orgId, eventId, tierId } = await raceSeed()
  const buyerId = await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: "Race buyer",
      role: "user",
      createdAt: now,
      updatedAt: now,
    }),
  )
  const token = await testAuthSessionTokenCreate(t, buyerId, authSecret)
  return { t, orgId, eventId, tierId, token }
}

function raceActionArgs(token: string, checkoutKey: string) {
  return {
    token,
    checkoutKey,
    eventKey: "organizer-race",
    catalogVersion: 1,
    eventRevision: 1,
    tickets: [{ tierKey: "standard", quantity: 1, participantNames: ["Ada Lovelace"] }],
    successUrl: "https://eventoren.test/checkout/success",
    cancelUrl: "https://eventoren.test/checkout/cancel",
    locale: "de" as const,
    customer: {
      email: "buyer@example.com",
      givenName: "Ada",
      familyName: "Lovelace",
      address: "Example Street 1",
      phone: "",
      billingDetails: {
        givenName: "Ada",
        familyName: "Lovelace",
        address: {
          line1: "Example Street 1",
          postalCode: "10115",
          city: "Berlin",
          country: "DE",
        },
      },
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

async function raceOrderByCheckoutKey(t: RaceFixture["t"], checkoutKey: string) {
  return await t.run(async (ctx) => {
    const order = await ctx.db
      .query("ticketOrders")
      .withIndex("checkoutKey", (q) => q.eq("checkoutKey", checkoutKey))
      .unique()
    const attempt = order
      ? await ctx.db
          .query("ticketPaymentAttempts")
          .withIndex("paymentReference", (q) => q.eq("paymentReference", order.paymentReference))
          .unique()
      : null
    return { order, attempt }
  })
}

test("the action suppresses a session created just before the block and expires it", async () => {
  raceEnvironmentSet()
  const { t, orgId, token } = await raceActionSeed()
  const billing = raceBillingMock(t, orgId, 200)
  const result = await t.action(
    api.ticketing.ticketCheckoutCreateAction,
    raceActionArgs(token, "raceactioncheckoutkey0000000000000008"),
  )
  expect(result.success).toBe(false)
  // No pay URL may leak through the blocked action response.
  expect(JSON.stringify(result)).not.toContain("https://checkout.stripe.test")
  expect(billing.expireCallsGet()).toBe(1)
  const { order, attempt } = await raceOrderByCheckoutKey(t, "raceactioncheckoutkey0000000000000008")
  expect(order).toMatchObject({
    status: "checkout_created",
    paymentStatus: "pending",
    billingOrderReference: "order_billing_race_08",
  })
  expect(order?.checkoutUrl).toBeUndefined()
  expect(attempt?.checkoutUrl).toBeUndefined()
  expect(attempt).toMatchObject({
    status: "checkout_created",
    billingOrderReference: "order_billing_race_08",
  })
})

test("a failed expire keeps the blocked order reconcilable instead of losing it", async () => {
  raceEnvironmentSet()
  const { t, orgId, token } = await raceActionSeed()
  const billing = raceBillingMock(t, orgId, 500)
  const result = await t.action(
    api.ticketing.ticketCheckoutCreateAction,
    raceActionArgs(token, "raceactioncheckoutkey0000000000000009"),
  )
  expect(result.success).toBe(false)
  expect(JSON.stringify(result)).not.toContain("https://checkout.stripe.test")
  expect(billing.expireCallsGet()).toBe(1)
  // The remote outcome stays correlated locally with a pending payment:
  // reconciliation (and a later paid settlement) can still find it.
  const { order, attempt } = await raceOrderByCheckoutKey(t, "raceactioncheckoutkey0000000000000009")
  expect(order).toMatchObject({
    status: "checkout_created",
    paymentStatus: "pending",
    billingOrderReference: "order_billing_race_08",
  })
  expect(order?.checkoutUrl).toBeUndefined()
  expect(attempt?.checkoutUrl).toBeUndefined()
  expect(order?.lastPaymentError).toBeUndefined()
  expect(attempt).toMatchObject({ status: "checkout_created" })
  if (order) {
    const ownerRead = await t.query(api.ticketing.ticketOrderGetQuery, { token, orderId: order._id })
    expect(ownerRead).toMatchObject({ success: true, data: { status: "checkout_created" } })
    expect(JSON.stringify(ownerRead)).not.toContain("https://checkout.stripe.test")
  }
})
