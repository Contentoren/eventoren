import { expect, test } from "@rstest/core"
import { e2eStripeTestClientCreate } from "../../stripe/e2eStripeTestClientCreate.ts"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import { ticketPurchasePaymentProofCheck } from "./ticketPurchasePaymentProofCheck.ts"

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

function startedPaymentCheckpoint(ticket: Record<string, unknown>): E2eCheckpoint {
  return {
    version: 1,
    target: "development",
    baseUrl: "https://eventoren.leonardomora.de",
    runId,
    createdAt: 1_000_000,
    phase: "ticket-unreconciled",
    ticket: {
      step: "payment",
      status: "started",
      eventKey,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 1_000_000,
      eventId: eventKey,
      productId: "ticket-1",
      orderId: "order-1",
      stripeSession: "cs_test_123",
      ...ticket,
    },
  } as E2eCheckpoint
}

const orderProofPending = async () => ({
  success: true,
  data: {
    paymentReference: "payment_123",
    orderReference: "order_123",
    status: "checkout_created",
    paymentStatus: "pending",
  },
})

const orderProofPaid = async () => ({
  success: true,
  data: {
    paymentReference: "payment_123",
    orderReference: "order_123",
    status: "paid",
    paymentStatus: "paid",
  },
})

const authoritativeUrl = "https://checkout.stripe.com/c/pay/cs_test_123#cs_test_fragment123"

function stripeFixture(
  options: { session?: unknown; customer?: unknown; intents?: unknown[]; charges?: unknown[]; account?: string } = {},
) {
  const calls: string[] = []
  const sessionPayload =
    options.session !== undefined
      ? options.session
      : {
          id: "cs_test_123",
          livemode: false,
          mode: "payment",
          status: "open",
          payment_status: "unpaid",
          customer: "cus_123",
          subscription: null,
          url: authoritativeUrl,
          payment_intent: null,
          metadata,
        }
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const parsed = new URL(String(url))
    const path = parsed.pathname.replace("/v1/", "")
    calls.push(`${init?.method ?? "GET"} ${path}`)
    let body: unknown
    if (path === "account") body = { id: options.account ?? account }
    if (path === "checkout/sessions/cs_test_123") body = sessionPayload
    if (path === "customers/cus_123") body = options.customer ?? { id: "cus_123", livemode: false, metadata }
    if (path === "payment_intents") body = { data: options.intents ?? [], has_more: false }
    if (path === "charges") body = { data: options.charges ?? [], has_more: false }
    return Response.json(body ?? {}, { status: body ? 200 : 404 })
  }) as typeof fetch
  return { calls, stripe: e2eStripeTestClientCreate(key, fetcher) }
}

test("permits retry of the same hosted session URL when open/unpaid with no intent", async () => {
  const { calls, stripe } = stripeFixture()
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result).toMatchObject({
    success: true,
    data: {
      state: "retry",
      orderId: "order-1",
      stripeSession: "cs_test_123",
      hostedUrl: authoritativeUrl,
    },
  })
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
  expect(calls).toEqual([
    "GET account",
    "GET checkout/sessions/cs_test_123",
    "GET customers/cus_123",
    "GET payment_intents",
    "GET charges",
  ])
  expect(calls.some((call) => call.includes("expire") || call.includes("DELETE") || call.startsWith("POST"))).toBe(
    false,
  )
})

test("retains when a payment intent already exists and never creates a new session", async () => {
  const { calls, stripe } = stripeFixture({
    intents: [{ id: "pi_123", livemode: false, customer: "cus_123", metadata }],
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result.success).toBe(false)
  expect(result.success ? "" : result.errorMessage).toMatch(/payment effect/u)
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
})

test("retains when a charge already exists", async () => {
  const { stripe } = stripeFixture({
    charges: [{ id: "ch_123", livemode: false, customer: "cus_123", payment_intent: "pi_123" }],
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result.success).toBe(false)
})

test("adopts the known success when complete/paid proof agrees", async () => {
  const { stripe } = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "complete",
      payment_status: "paid",
      customer: "cus_123",
      subscription: null,
      metadata,
    },
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPaid,
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { state: "paid", orderId: "order-1" } })
})

test("retains foreign, expired and unavailable payment proof without mutation", async () => {
  const foreign = stripeFixture({
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
      await ticketPurchasePaymentProofCheck({
        checkpoint: startedPaymentCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofPending,
        stripe: foreign.stripe,
      })
    ).success,
  ).toBe(false)
  expect(foreign.calls.every((call) => call.startsWith("GET"))).toBe(true)

  const expired = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "expired",
      payment_status: "unpaid",
      customer: "cus_123",
      subscription: null,
      metadata,
    },
  })
  expect(
    (
      await ticketPurchasePaymentProofCheck({
        checkpoint: startedPaymentCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofPending,
        stripe: expired.stripe,
      })
    ).success,
  ).toBe(false)

  const unavailable = stripeFixture()
  expect(
    (
      await ticketPurchasePaymentProofCheck({
        checkpoint: startedPaymentCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: async () => ({ success: false as const, errorMessage: "down" }),
        stripe: unavailable.stripe,
      })
    ).success,
  ).toBe(false)
})

test("reports the backend refusal reason instead of swallowing it", async () => {
  const { calls, stripe } = stripeFixture()
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: async () => ({
      success: false as const,
      errorMessage: "Exact test order/event ownership cannot be proven",
    }),
    stripe,
  })
  expect(result.success).toBe(false)
  expect(result.success ? "" : result.errorMessage).toBe(
    "App order correlation refused (Exact test order/event ownership cannot be proven); checkpoint retained",
  )
  expect(calls).toEqual([])
})

test("maps hostile refusal diagnostics to the fixed unknown reason without leaking", async () => {
  const { calls, stripe } = stripeFixture()
  const hostile = `Bad;\nDROP users;--${"\u0007"}${"x".repeat(300)}`
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: async () => ({ success: false as const, errorMessage: hostile }),
    stripe,
  })
  expect(result.success).toBe(false)
  expect(result.success ? "" : result.errorMessage).toBe(
    "App order correlation refused (unknown reason); checkpoint retained",
  )
  expect(calls).toEqual([])
})

test("never echoes secrets, tokens or PII from backend refusal diagnostics", async () => {
  for (const secret of [
    "sk_test_51SecretToken123456789",
    "rk_test_51SecretToken123456789",
    "Bearer sess_token_abc123XYZ",
    "buyer@example.test",
    "E2E Participant abc-12345678-1234-1234-1234-123456789abc",
    "order-1 cs_test_123 cus_123",
  ]) {
    const { calls, stripe } = stripeFixture()
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: async () => ({ success: false as const, errorMessage: `custom failure: ${secret}` }),
      stripe,
    })
    expect(result.success).toBe(false)
    const message = result.success ? "" : result.errorMessage
    expect(message).toBe("App order correlation refused (unknown reason); checkpoint retained")
    expect(message).not.toContain(secret)
    expect(message).not.toContain("sk_test")
    expect(message).not.toContain("sess_token")
    expect(message).not.toContain("@")
    expect(calls).toEqual([])
  }
})

test("reports every safe backend refusal constant from the exact allowlist", async () => {
  for (const reason of [
    "Run marker mismatch",
    "Invalid order ID",
    "Exact test order/event ownership cannot be proven",
    "Saved order payment/Billing references missing",
    "Exact event order discovery exceeds proof bound",
    "Other active or uncorrelated event order conflicts with saved proof",
  ]) {
    const { calls, stripe } = stripeFixture()
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: async () => ({ success: false as const, errorMessage: reason }),
      stripe,
    })
    expect(result.success).toBe(false)
    expect(result.success ? "" : result.errorMessage).toBe(
      `App order correlation refused (${reason}); checkpoint retained`,
    )
    expect(calls).toEqual([])
  }
})

test("requires a one-time payment mode and a null subscription for paid adoption and retry", async () => {
  for (const session of [
    { mode: "subscription", subscription: null },
    { mode: "payment", subscription: "sub_test_123" },
    { mode: "subscription", subscription: "sub_test_123" },
    { mode: "setup", subscription: null },
  ]) {
    const retryFixture = stripeFixture({
      session: {
        id: "cs_test_123",
        livemode: false,
        ...session,
        status: "open",
        payment_status: "unpaid",
        customer: "cus_123",
        url: authoritativeUrl,
        payment_intent: null,
        metadata,
      },
    })
    const retry = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: orderProofPending,
      stripe: retryFixture.stripe,
    })
    expect(retry.success).toBe(false)
    expect(retry.success ? "" : retry.errorMessage).toMatch(/mode|subscription/u)
    expect(retryFixture.calls.every((call) => call.startsWith("GET"))).toBe(true)
    const paidFixture = stripeFixture({
      session: {
        id: "cs_test_123",
        livemode: false,
        ...session,
        status: "complete",
        payment_status: "paid",
        customer: "cus_123",
        metadata,
      },
    })
    const paid = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: orderProofPaid,
      stripe: paidFixture.stripe,
    })
    expect(paid.success).toBe(false)
    expect(paid.success ? "" : paid.errorMessage).toMatch(/mode|subscription/u)
  }
})

test("distinguishes proof shape mismatch from backend refusal", async () => {
  const { calls, stripe } = stripeFixture()
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: async () => ({
      success: true,
      data: { paymentReference: "", orderReference: "", status: "checkout_created", paymentStatus: "pending" },
    }),
    stripe,
  })
  expect(result.success).toBe(false)
  expect(result.success ? "" : result.errorMessage).toBe("App order proof shape mismatch; checkpoint retained")
  expect(calls).toEqual([])
})

test("preserves the exact authoritative session URL fragment instead of constructing one", async () => {
  const exact = "https://checkout.stripe.com/c/pay/cs_test_123#cs_test_exactfragment99"
  const { stripe } = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "open",
      payment_status: "unpaid",
      customer: "cus_123",
      subscription: null,
      url: exact,
      payment_intent: null,
      metadata,
    },
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { state: "retry", hostedUrl: exact } })
  expect(result.success ? result.data.hostedUrl : "").toContain("#")
})

test("retains when the authoritative URL misses the fragment or leaves the checkout origin", async () => {
  for (const badUrl of [
    "https://checkout.stripe.com/c/pay/cs_test_123",
    "https://example.com/c/pay/cs_test_123#cs_test_fragment123",
    "http://checkout.stripe.com/c/pay/cs_test_123#cs_test_fragment123",
  ]) {
    const { stripe } = stripeFixture({
      session: {
        id: "cs_test_123",
        livemode: false,
        mode: "payment",
        status: "open",
        payment_status: "unpaid",
        customer: "cus_123",
        subscription: null,
        url: badUrl,
        payment_intent: null,
        metadata,
      },
    })
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: orderProofPending,
      stripe,
    })
    expect(result.success).toBe(false)
  }
})

test("refuses retry when the session already carries a direct payment intent", async () => {
  const { calls, stripe } = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "open",
      payment_status: "unpaid",
      customer: "cus_123",
      subscription: null,
      url: authoritativeUrl,
      payment_intent: "pi_123",
      metadata,
    },
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result.success).toBe(false)
  expect(result.success ? "" : result.errorMessage).toMatch(/payment effect/u)
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
})

test("refuses retry for terminal app orders even when Stripe is open and unpaid", async () => {
  for (const status of ["released", "expired", "failed", "cancelled"]) {
    const { stripe } = stripeFixture()
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: async () => ({
        success: true,
        data: {
          paymentReference: "payment_123",
          orderReference: "order_123",
          status,
          paymentStatus: "pending",
        },
      }),
      stripe,
    })
    expect(result.success).toBe(false)
    expect(result.success ? "" : result.errorMessage).toMatch(/retryable|terminal|checkout\/reserved/u)
  }
})

test("requires explicit null payment_intent even though the adapter accepts an absent field", async () => {
  const { calls, stripe } = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "open",
      payment_status: "unpaid",
      customer: "cus_123",
      subscription: null,
      url: authoritativeUrl,
      metadata,
    },
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result.success).toBe(false)
  expect(calls).not.toContain("GET payment_intents")
})

test("empty effect lists cannot prove a foreign-stable, missing, deleted, ambiguous or LIVE customer", async () => {
  for (const customer of [
    {},
    { id: "cus_foreign", livemode: false, metadata },
    { id: "cus_123", livemode: false, deleted: true, metadata },
    { id: "cus_123", livemode: true, metadata },
    // Only the stable triple binds the linked (possibly reused) customer:
    // a reused customer's creation metadata keeps old event/payment/order
    // refs, so those are covered by the reuse tests below, not refused here.
    ...["source", "organization_id", "stripe_mode"].map((field) => ({
      id: "cus_123",
      livemode: false,
      metadata: { ...metadata, [field]: "foreign" },
    })),
  ]) {
    const { stripe, calls } = stripeFixture({ customer })
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: orderProofPending,
      stripe,
    })
    expect(result.success).toBe(false)
    expect(calls).toEqual(["GET account", "GET checkout/sessions/cs_test_123", "GET customers/cus_123"])
  }
})

test("complete paid Stripe cannot adopt terminal or inventory-conflicted app orders", async () => {
  for (const status of ["released", "failed", "expired", "paid_inventory_conflict", "checkout_created", "reserved"]) {
    const { stripe } = stripeFixture({
      session: {
        id: "cs_test_123",
        livemode: false,
        mode: "payment",
        status: "complete",
        payment_status: "paid",
        customer: "cus_123",
        subscription: null,
        metadata,
      },
    })
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: async () => ({ success: true, data: { ...(await orderProofPaid()).data, status } }),
      stripe,
    })
    expect(result.success).toBe(false)
  }
})

test("NULL checkout customer cannot authorize retry even when effect lists would be empty", async () => {
  const { stripe, calls } = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "open",
      payment_status: "unpaid",
      customer: null,
      subscription: null,
      url: authoritativeUrl,
      payment_intent: null,
      metadata,
    },
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result.success).toBe(false)
  expect(calls).toEqual(["GET account", "GET checkout/sessions/cs_test_123"])
})

const reusedCustomerMetadata = {
  source: "eventoren_ticket",
  event_key: "ticket-e2e-old-99999999-1234-1234-1234-123456789abc",
  organization_id: org,
  stripe_mode: "test",
  payment_reference: "payment_old",
  order_reference: "order_old",
}

test("permits retry for a reused customer keeping old creation refs with current session refs", async () => {
  const { calls, stripe } = stripeFixture({
    customer: { id: "cus_123", livemode: false, metadata: reusedCustomerMetadata },
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result).toMatchObject({
    success: true,
    data: { state: "retry", orderId: "order-1", stripeSession: "cs_test_123", hostedUrl: authoritativeUrl },
  })
  expect(calls.every((call) => call.startsWith("GET"))).toBe(true)
})

test("adopts paid success for a reused customer keeping old creation refs", async () => {
  const { stripe } = stripeFixture({
    session: {
      id: "cs_test_123",
      livemode: false,
      mode: "payment",
      status: "complete",
      payment_status: "paid",
      customer: "cus_123",
      subscription: null,
      metadata,
    },
    customer: { id: "cus_123", livemode: false, metadata: reusedCustomerMetadata },
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPaid,
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { state: "paid", orderId: "order-1" } })
})

test("refuses a reused-shaped customer with foreign stable organization or mode", async () => {
  for (const customer of [
    { id: "cus_123", livemode: false, metadata: { ...reusedCustomerMetadata, organization_id: "org_foreign" } },
    { id: "cus_123", livemode: false, metadata: { ...reusedCustomerMetadata, stripe_mode: "live" } },
    { id: "cus_123", livemode: false, metadata: { ...reusedCustomerMetadata, source: "foreign" } },
  ]) {
    const { stripe, calls } = stripeFixture({ customer })
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: orderProofPending,
      stripe,
    })
    expect(result.success).toBe(false)
    expect(calls).toEqual(["GET account", "GET checkout/sessions/cs_test_123", "GET customers/cus_123"])
  }
})

test("preserves unrelated proven historical effects on a reused customer", async () => {
  const { stripe } = stripeFixture({
    customer: { id: "cus_123", livemode: false, metadata: reusedCustomerMetadata },
    intents: [{ id: "pi_old", livemode: false, customer: "cus_123", metadata: reusedCustomerMetadata }],
    charges: [{ id: "ch_old", livemode: false, customer: "cus_123", payment_intent: "pi_old" }],
  })
  const result = await ticketPurchasePaymentProofCheck({
    checkpoint: startedPaymentCheckpoint({}),
    organizationId: org,
    accountId: account,
    key,
    orderProof: orderProofPending,
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { state: "retry", hostedUrl: authoritativeUrl } })
})

test("refuses reused-shaped historical effects with missing or foreign organization or mode", async () => {
  const reused = { id: "cus_123", livemode: false, metadata: reusedCustomerMetadata }
  for (const intentMetadata of [
    { ...reusedCustomerMetadata, organization_id: "org_foreign" },
    { ...reusedCustomerMetadata, stripe_mode: "live" },
    { ...reusedCustomerMetadata, organization_id: "" },
    { ...reusedCustomerMetadata, stripe_mode: "" },
    {
      source: "eventoren_ticket",
      event_key: reusedCustomerMetadata.event_key,
      payment_reference: "payment_old",
      order_reference: "order_old",
    },
    {
      source: "eventoren_ticket",
      event_key: reusedCustomerMetadata.event_key,
      organization_id: org,
      payment_reference: "payment_old",
      order_reference: "order_old",
    },
  ]) {
    const { stripe } = stripeFixture({
      customer: reused,
      intents: [{ id: "pi_old", livemode: false, customer: "cus_123", metadata: intentMetadata }],
      charges: [],
    })
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: orderProofPending,
      stripe,
    })
    expect(result.success).toBe(false)
    expect(result.success ? "" : result.errorMessage).toMatch(/payment effect/u)
  }
})

test("refuses current-bound or ambiguous effects on a reused customer", async () => {
  const reused = { id: "cus_123", livemode: false, metadata: reusedCustomerMetadata }
  // Current-bound intent (current refs) refuses even with an old-refs customer.
  const currentIntent = stripeFixture({
    customer: reused,
    intents: [{ id: "pi_123", livemode: false, customer: "cus_123", metadata }],
  })
  expect(
    (
      await ticketPurchasePaymentProofCheck({
        checkpoint: startedPaymentCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofPending,
        stripe: currentIntent.stripe,
      })
    ).success,
  ).toBe(false)
  // Charge bound to a current intent refuses.
  const currentCharge = stripeFixture({
    customer: reused,
    intents: [{ id: "pi_123", livemode: false, customer: "cus_123", metadata }],
    charges: [{ id: "ch_123", livemode: false, customer: "cus_123", payment_intent: "pi_123" }],
  })
  expect(
    (
      await ticketPurchasePaymentProofCheck({
        checkpoint: startedPaymentCheckpoint({}),
        organizationId: org,
        accountId: account,
        key,
        orderProof: orderProofPending,
        stripe: currentCharge.stripe,
      })
    ).success,
  ).toBe(false)
  // Orphan/ambiguous charge (unknown intent) and ref-less intent retain.
  for (const effects of [
    { intents: [], charges: [{ id: "ch_123", livemode: false, customer: "cus_123", payment_intent: "pi_123" }] },
    { intents: [], charges: [{ id: "ch_123", livemode: false, customer: "cus_123", payment_intent: null }] },
    { intents: [{ id: "pi_123", livemode: false, customer: "cus_123", metadata: {} }], charges: [] },
  ]) {
    const { stripe } = stripeFixture({ customer: reused, ...effects })
    const result = await ticketPurchasePaymentProofCheck({
      checkpoint: startedPaymentCheckpoint({}),
      organizationId: org,
      accountId: account,
      key,
      orderProof: orderProofPending,
      stripe,
    })
    expect(result.success).toBe(false)
    expect(result.success ? "" : result.errorMessage).toMatch(/payment effect/u)
  }
})
