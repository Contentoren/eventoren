import { expect, test } from "@rstest/core"
import { e2eStripeHistoricalCleanupScan } from "./e2eStripeHistoricalCleanupScan.ts"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"

const org = "org_test"
const eventKey = "ticket-e2e-mold-12345678-1234-1234-1234-123456789abc"
const liveEventKey = "ticket-e2e-mlive-12345678-1234-1234-1234-123456789abc"

function ownedMetadata(overrides: Record<string, string> = {}) {
  return {
    source: "eventoren_ticket",
    event_key: eventKey,
    organization_id: org,
    stripe_mode: "test",
    payment_reference: "payment_hist",
    order_reference: "order_hist",
    ...overrides,
  }
}

function stripeFixture() {
  const calls: string[] = []
  let openStatus = "open"
  let subscriptionStatus = "active"
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const path = new URL(String(url)).pathname.replace("/v1/", "")
    calls.push(`${init?.method ?? "GET"} ${path}`)
    let body: unknown
    if (path === "account") body = { id: "acct_test" }
    if (path === "checkout/sessions")
      body = {
        data: [
          {
            id: "cs_test_hist",
            livemode: false,
            mode: "payment",
            status: openStatus,
            payment_status: "unpaid",
            customer: "cus_hist",
            subscription: null,
            metadata: ownedMetadata(),
          },
          {
            id: "cs_test_paid",
            livemode: false,
            mode: "payment",
            status: "complete",
            payment_status: "paid",
            customer: "cus_paid",
            subscription: null,
            metadata: ownedMetadata({
              event_key: eventKey,
              payment_reference: "payment_paid",
              order_reference: "order_paid",
            }),
          },
          {
            id: "cs_test_live",
            livemode: false,
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            customer: "cus_live",
            subscription: null,
            metadata: ownedMetadata({ event_key: liveEventKey, stripe_mode: "live" }),
          },
        ],
        has_more: false,
      }
    if (path === "checkout/sessions/cs_test_hist") {
      body = {
        id: "cs_test_hist",
        livemode: false,
        mode: "payment",
        status: openStatus,
        payment_status: "unpaid",
        customer: "cus_hist",
        subscription: null,
        metadata: ownedMetadata(),
      }
    }
    if (path === "checkout/sessions/cs_test_hist/expire") {
      openStatus = "expired"
      body = {
        id: "cs_test_hist",
        livemode: false,
        mode: "payment",
        status: openStatus,
        payment_status: "unpaid",
        customer: "cus_hist",
        subscription: null,
        metadata: ownedMetadata(),
      }
    }
    if (path === "subscriptions")
      body = {
        data: [
          {
            id: "sub_hist",
            livemode: false,
            customer: "cus_hist",
            status: subscriptionStatus,
            metadata: ownedMetadata(),
          },
        ],
        has_more: false,
      }
    if (path === "subscriptions/sub_hist") {
      if (init?.method === "DELETE") subscriptionStatus = "canceled"
      body = {
        id: "sub_hist",
        livemode: false,
        customer: "cus_hist",
        status: subscriptionStatus,
        metadata: ownedMetadata(),
      }
    }
    return Response.json(body ?? {}, { status: body ? 200 : 404 })
  }) as typeof fetch
  return { calls, stripe: e2eStripeTestClientCreate("sk_test_hist123", fetcher) }
}

test("expires open test sessions and cancels subscriptions without touching history or live objects", async () => {
  const { calls, stripe } = stripeFixture()
  const ledgers: unknown[] = []
  const result = await e2eStripeHistoricalCleanupScan({
    candidates: [
      { eventKey, kind: "ticket-e2e" },
      { eventKey: liveEventKey, kind: "ticket-e2e" },
    ],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe,
    ledgerAppend: async (entry) => {
      ledgers.push(entry)
      return { success: true }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ sessionsExpired: 1, subscriptionsCanceled: 1 })
  expect((result.data as { retainedLive: string[] }).retainedLive).toContain("cs_test_live")
  expect(ledgers).toHaveLength(1)
  expect(calls).toContain("POST checkout/sessions/cs_test_hist/expire")
  expect(calls).toContain("DELETE subscriptions/sub_hist")
  expect(calls.every((call) => !call.includes("payment_intent") || call.startsWith("GET"))).toBe(true)
  expect(calls).not.toContain("DELETE customers/cus_hist")
  expect(calls.filter((call) => call.startsWith("POST") || call.startsWith("DELETE"))).toEqual([
    "POST checkout/sessions/cs_test_hist/expire",
    "DELETE subscriptions/sub_hist",
  ])
})

test("persists the mutation plan before uncertain effects and retains evidence on ledger failure", async () => {
  const { stripe } = stripeFixture()
  let mutated = false
  const fetcherStripe = {
    ...stripe,
    expire: async () => {
      mutated = true
      return { success: true as const, data: {} }
    },
  }
  const result = await e2eStripeHistoricalCleanupScan({
    candidates: [{ eventKey, kind: "ticket-e2e" }],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe: fetcherStripe,
    ledgerAppend: async () => ({ success: false, errorMessage: "ledger unavailable" }),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(mutated).toBe(false)
})

test("returns no-fixture for catalog-only legacy kinds without Stripe credentials", async () => {
  const { stripe } = stripeFixture()
  const result = await e2eStripeHistoricalCleanupScan({
    candidates: [
      { eventKey: "native-auth-12345678-1234-1234-1234-123456789abc", kind: "native-auth" },
      { eventKey: "readiness-technical-draft-20260914", kind: "readiness" },
    ],
    organizationId: "",
    accountId: "",
    key: "",
    stripe,
  })
  expect(result).toMatchObject({ success: true, data: { status: "no-fixture" } })
})

function exclusiveStripeFixture() {
  const calls: string[] = []
  let deleted = false
  const customerMetadata = ownedMetadata()
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const parsed = new URL(String(url))
    const path = parsed.pathname.replace("/v1/", "")
    calls.push(`${init?.method ?? "GET"} ${path}${parsed.search}`)
    let body: unknown
    if (path === "account") body = { id: "acct_test" }
    if (path === "checkout/sessions" && !parsed.search.includes("customer="))
      body = {
        data: [
          {
            id: "cs_test_exclusive",
            livemode: false,
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            customer: "cus_exclusive",
            subscription: null,
            metadata: ownedMetadata(),
          },
        ],
        has_more: false,
      }
    if (path === "checkout/sessions" && parsed.search.includes("customer=cus_exclusive"))
      body = {
        data: [
          {
            id: "cs_test_exclusive",
            livemode: false,
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            customer: "cus_exclusive",
            subscription: null,
            metadata: ownedMetadata(),
          },
        ],
        has_more: false,
      }
    if (path === "checkout/sessions/cs_test_exclusive") {
      const status = calls.some((call) => call.startsWith("POST checkout/sessions/cs_test_exclusive/expire"))
        ? "expired"
        : "open"
      body = {
        id: "cs_test_exclusive",
        livemode: false,
        mode: "payment",
        status,
        payment_status: "unpaid",
        customer: "cus_exclusive",
        subscription: null,
        metadata: ownedMetadata(),
      }
    }
    if (path === "checkout/sessions/cs_test_exclusive/expire")
      body = {
        id: "cs_test_exclusive",
        livemode: false,
        mode: "payment",
        status: "expired",
        payment_status: "unpaid",
        customer: "cus_exclusive",
        subscription: null,
        metadata: ownedMetadata(),
      }
    if (path === "subscriptions") body = { data: [], has_more: false }
    if (path === "payment_intents") body = { data: [], has_more: false }
    if (path === "invoices") body = { data: [], has_more: false }
    if (path === "charges") body = { data: [], has_more: false }
    if (path === "customers/cus_exclusive") {
      if (init?.method === "DELETE") {
        deleted = true
        body = { id: "cus_exclusive", deleted: true }
      } else if (deleted) body = { id: "cus_exclusive", deleted: true }
      else body = { id: "cus_exclusive", livemode: false, metadata: customerMetadata }
    }
    return Response.json(body ?? {}, { status: body ? 200 : 404 })
  }) as typeof fetch
  return { calls, stripe: e2eStripeTestClientCreate("sk_test_hist123", fetcher) }
}

test("deletes only proof-exclusive test customers with zero history after ledger intent, retaining financial history", async () => {
  const { calls, stripe } = exclusiveStripeFixture()
  const ledgers: unknown[] = []
  const result = await e2eStripeHistoricalCleanupScan({
    candidates: [{ eventKey, kind: "ticket-e2e" }],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe,
    customerExclusive: async (id) => id === "cus_exclusive",
    ledgerAppend: async (entry) => {
      ledgers.push(entry)
      return { success: true }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ sessionsExpired: 1, customersDeleted: 1, customersRetained: 0 })
  expect(
    (ledgers[0] as { historicalStripePlan: { deleteCustomers: string[] } }).historicalStripePlan.deleteCustomers,
  ).toEqual(["cus_exclusive"])
  expect(calls).toContain("DELETE customers/cus_exclusive")
  expect(calls).toContain("POST checkout/sessions/cs_test_exclusive/expire")
})

test("retains exclusive-proof customers when any intent, invoice, charge or subscription exists", async () => {
  const { stripe } = stripeFixture()
  const result = await e2eStripeHistoricalCleanupScan({
    candidates: [{ eventKey, kind: "ticket-e2e" }],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe,
    customerExclusive: async () => true,
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ customersDeleted: 0 })
  expect((result.data as { customersRetained: number }).customersRetained).toBeGreaterThan(0)
})

test("discovers orphaned TEST sessions globally when ledger candidates are gone", async () => {
  const { stripe } = stripeFixture()
  const ledgers: unknown[] = []
  const result = await e2eStripeHistoricalCleanupScan({
    candidates: [],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe,
    ledgerAppend: async (entry) => {
      ledgers.push(entry)
      return { success: true }
    },
  })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ sessionsExpired: 1, subscriptionsCanceled: 1 })
  expect((result.data as { retainedLive: string[] }).retainedLive).toContain("cs_test_live")
  expect(ledgers).toHaveLength(1)
})
