import { expect, test } from "@rstest/core"
import { e2eStripeTestClientCreate } from "../../stripe/e2eStripeTestClientCreate.ts"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import { ticketPurchaseCheckoutProofCheck } from "./ticketPurchaseCheckoutProofCheck.ts"

const runId = "abc-12345678-1234-1234-1234-123456789abc"
const eventKey = `ticket-e2e-${runId}`
const org = "org_test"
const account = "acct_test"
const key = "sk_test_dummy"
const metadata = {
  source: "eventoren_ticket",
  event_key: eventKey,
  organization_id: org,
  stripe_mode: "test",
  payment_reference: "payment_123",
  order_reference: "order_123",
}

function startedCheckpoint(ticket: Record<string, unknown>): E2eCheckpoint {
  return {
    version: 1,
    target: "development",
    baseUrl: "https://eventoren.leonardomora.de",
    runId,
    createdAt: 1_000_000,
    phase: "ticket-unreconciled",
    ticket: {
      step: "checkout",
      status: "started",
      eventKey,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 1_000_000,
      eventId: eventKey,
      productId: "ticket-1",
      ...ticket,
    },
  } as E2eCheckpoint
}

const orderProofOwn = async () => ({
  success: true,
  data: {
    paymentReference: "payment_123",
    orderReference: "order_123",
    status: "checkout_created",
    paymentStatus: "pending",
  },
})

const emptyDiscovery = async () => ({
  success: true as const,
  data: { page: [], isDone: true as const, continueCursor: null as string | null },
})

function stripeFixture(options: { live?: boolean; account?: string; sessions?: unknown[]; session?: unknown } = {}) {
  const calls: string[] = []
  const sessionPayload =
    options.session !== undefined
      ? options.session
      : {
          id: "cs_test_123",
          livemode: options.live ?? false,
          mode: "payment",
          status: "open",
          payment_status: "unpaid",
          customer: "cus_123",
          subscription: null,
          metadata,
        }
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname.replace("/v1/", "")
    calls.push(`${init?.method ?? "GET"} ${path}`)
    let body: unknown
    if (path === "account") body = { id: options.account ?? account }
    if (path === "checkout/sessions/cs_test_123") body = sessionPayload
    if (path === "checkout/sessions")
      body = { data: options.sessions ?? (sessionPayload ? [sessionPayload] : []), has_more: false }
    return Response.json(body ?? {}, { status: body ? 200 : 404 })
  }) as typeof fetch
  return { calls, stripe: e2eStripeTestClientCreate(key, fetcher) }
}

test("adopts the lost-response own session without creating a new session", async () => {
  const { calls, stripe } = stripeFixture()
  const result = await ticketPurchaseCheckoutProofCheck({
    checkpoint: startedCheckpoint({ orderId: "order-1", stripeSession: "cs_test_123" }),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofOwn,
    orderDiscovery: emptyDiscovery,
    stripe,
  })
  expect(result).toMatchObject({
    success: true,
    data: { state: "own", orderId: "order-1", stripeSession: "cs_test_123" },
  })
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
  expect(calls.some((call) => call.includes("expire") || call.includes("DELETE") || call.startsWith("POST"))).toBe(
    false,
  )
})

test("permits a single create on proven global absence with the same run intent", async () => {
  const { calls, stripe } = stripeFixture({ sessions: [], session: null })
  const result = await ticketPurchaseCheckoutProofCheck({
    checkpoint: startedCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofOwn,
    orderDiscovery: emptyDiscovery,
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { state: "absent" } })
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
})

test("fails without effect for mismatched live mode, account, organization or order metadata", async () => {
  const live = stripeFixture({ live: true })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({ orderId: "order-1", stripeSession: "cs_test_123" }),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: emptyDiscovery,
        stripe: live.stripe,
      })
    ).success,
  ).toBe(false)
  expect(live.calls.every((call) => call.startsWith("GET"))).toBe(true)

  const otherAccount = stripeFixture({ account: "acct_other" })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({ orderId: "order-1", stripeSession: "cs_test_123" }),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: emptyDiscovery,
        stripe: otherAccount.stripe,
      })
    ).success,
  ).toBe(false)

  const foreignOrg = stripeFixture()
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({ orderId: "order-1", stripeSession: "cs_test_123" }),
        organizationId: "org_foreign",
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: emptyDiscovery,
        stripe: foreignOrg.stripe,
      })
    ).success,
  ).toBe(false)

  const foreignMetadata = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "open",
      payment_status: "unpaid",
      customer: "cus_123",
      subscription: null,
      metadata: { ...metadata, event_key: "ticket-e2e-foreign" },
    },
  })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({ orderId: "order-1", stripeSession: "cs_test_123" }),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: emptyDiscovery,
        stripe: foreignMetadata.stripe,
      })
    ).success,
  ).toBe(false)
  expect(foreignMetadata.calls.every((call) => call.startsWith("GET"))).toBe(true)
})

test("retains partial, multiple and foreign checkout state without mutation", async () => {
  const partial = stripeFixture()
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({ orderId: "order-1" }),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: emptyDiscovery,
        stripe: partial.stripe,
      })
    ).success,
  ).toBe(false)
  expect(partial.calls).toEqual([])

  const multiple = stripeFixture({
    sessions: [
      { id: "cs_test_123", livemode: false, customer: "cus_123", metadata },
      { id: "cs_test_456", livemode: false, customer: "cus_456", metadata },
    ],
    session: null,
  })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: emptyDiscovery,
        stripe: multiple.stripe,
      })
    ).success,
  ).toBe(false)
  expect(multiple.calls.every((call) => call.startsWith("GET"))).toBe(true)

  const foreign = stripeFixture({
    sessions: [
      { id: "cs_test_foreign", livemode: false, customer: "cus_9", metadata: { ...metadata, event_key: eventKey } },
    ],
    session: null,
  })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: emptyDiscovery,
        stripe: foreign.stripe,
      })
    ).success,
  ).toBe(false)
})

function pendingDiscoveryRow() {
  return {
    orderId: "order-pending-1",
    status: "reserved",
    paymentStatus: "pending",
    billingOrderReference: null,
    checkoutUrl: null,
    stripeSessionId: null,
    reservationExpiresAt: Date.now() + 900_000,
  }
}

test("retains a single owned pending reservation without a Stripe session instead of duplicating it", async () => {
  const { stripe } = stripeFixture({ sessions: [], session: null })
  const discovery = async () => ({
    success: true as const,
    data: { page: [pendingDiscoveryRow()], isDone: true as const, continueCursor: null as string | null },
  })
  const result = await ticketPurchaseCheckoutProofCheck({
    checkpoint: startedCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofOwn,
    orderDiscovery: discovery,
    stripe,
  })
  expect(result.success).toBe(false)
  expect(result.success ? "" : result.errorMessage).toMatch(/order-pending-1/u)
})

test("permits one new attempt when the single owned row is terminal expired and keeps its history", async () => {
  const { stripe } = stripeFixture({ sessions: [], session: null })
  const discovery = async () => ({
    success: true as const,
    data: {
      page: [{ ...pendingDiscoveryRow(), orderId: "order-old-1", status: "expired", paymentStatus: "expired" }],
      isDone: true as const,
      continueCursor: null as string | null,
    },
  })
  const result = await ticketPurchaseCheckoutProofCheck({
    checkpoint: startedCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofOwn,
    orderDiscovery: discovery,
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { state: "absent" } })
})

test("permits retry when retained history holds N terminal rows with failed/expired payment", async () => {
  const { stripe } = stripeFixture({ sessions: [], session: null })
  const discovery = async () => ({
    success: true as const,
    data: {
      page: [
        { ...pendingDiscoveryRow(), orderId: "order-old-1", status: "expired", paymentStatus: "expired" },
        { ...pendingDiscoveryRow(), orderId: "order-old-2", status: "failed", paymentStatus: "failed" },
      ],
      isDone: true as const,
      continueCursor: null as string | null,
    },
  })
  const result = await ticketPurchaseCheckoutProofCheck({
    checkpoint: startedCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofOwn,
    orderDiscovery: discovery,
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { state: "absent" } })
})

test("refuses when retained history mixes a terminal row with a pending reservation", async () => {
  const { stripe } = stripeFixture({ sessions: [], session: null })
  const discovery = async () => ({
    success: true as const,
    data: {
      page: [
        { ...pendingDiscoveryRow(), orderId: "order-old-1", status: "expired", paymentStatus: "expired" },
        pendingDiscoveryRow(),
      ],
      isDone: true as const,
      continueCursor: null as string | null,
    },
  })
  const result = await ticketPurchaseCheckoutProofCheck({
    checkpoint: startedCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofOwn,
    orderDiscovery: discovery,
    stripe,
  })
  expect(result.success).toBe(false)
  expect(result.success ? "" : result.errorMessage).toMatch(/order-pending-1/u)
})

test("retains multiple owned rows and paid rows without mutation", async () => {
  const { stripe } = stripeFixture({ sessions: [], session: null })
  const multiple = async () => ({
    success: true as const,
    data: {
      page: [pendingDiscoveryRow(), { ...pendingDiscoveryRow(), orderId: "order-pending-2" }],
      isDone: true as const,
      continueCursor: null as string | null,
    },
  })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: multiple,
        stripe,
      })
    ).success,
  ).toBe(false)
  const paid = async () => ({
    success: true as const,
    data: {
      page: [{ ...pendingDiscoveryRow(), status: "paid", paymentStatus: "paid" }],
      isDone: true as const,
      continueCursor: null as string | null,
    },
  })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: paid,
        stripe,
      })
    ).success,
  ).toBe(false)
  const unavailable = async () => ({ success: false as const, errorMessage: "down" })
  expect(
    (
      await ticketPurchaseCheckoutProofCheck({
        checkpoint: startedCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofOwn,
        orderDiscovery: unavailable,
        stripe,
      })
    ).success,
  ).toBe(false)
})
