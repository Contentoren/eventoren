import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { adminTicketOrderGet } from "../src/admin/adminTicketOrderGet.ts"

test("denied admin lookup never calls Billing and does not expose order PII", async () => {
  const client = {
    query: async () => ({ success: false, errorMessage: "Admin role required" }),
  } as unknown as ConvexHttpClient
  const result = await adminTicketOrderGet({ token: "unauthorized", orderId: "order" }, client)
  expect(result).toMatchObject({ success: false, errorMessage: "Bestellung konnte nicht geladen werden." })
})

test("missing Billing configuration preserves the authorized local order", async () => {
  const local = {
    id: "order",
    billingOrderReference: "billing-order",
    paymentReference: "payment-reference",
    customerEmail: "buyer@example.test",
  }
  const client = { query: async () => ({ success: true, data: local }) } as unknown as ConvexHttpClient
  const previous = process.env.EVENTOREN_BILLING_BASE_URL
  delete process.env.EVENTOREN_BILLING_BASE_URL
  try {
    const result = await adminTicketOrderGet({ token: "admin", orderId: "order" }, client)
    expect(result).toMatchObject({
      success: true,
      data: { customerEmail: "buyer@example.test", stripeDetails: null, stripeError: "Billing ist nicht verfügbar." },
    })
  } finally {
    if (previous === undefined) delete process.env.EVENTOREN_BILLING_BASE_URL
    else process.env.EVENTOREN_BILLING_BASE_URL = previous
  }
})

test("host-side development detail lookup uses Billing preview loopback instead of the Convex gateway", async () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    baseUrl: process.env.EVENTOREN_BILLING_BASE_URL,
    organizationId: process.env.EVENTOREN_BILLING_ORGANIZATION_ID,
    credential: process.env.EVENTOREN_BILLING_API_CREDENTIAL,
    stripeMode: process.env.EVENTOREN_BILLING_STRIPE_MODE,
    publicBaseUrl: process.env.EVENTOREN_PUBLIC_BASE_URL,
    fetch: globalThis.fetch,
  }
  process.env.NODE_ENV = "development"
  process.env.EVENTOREN_BILLING_BASE_URL = "http://169.254.1.2:3146"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "org-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "test-credential"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
  const targets: string[] = []
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL) => {
      targets.push(String(input))
      return new Response(null, { status: 404 })
    },
    { preconnect: previous.fetch.preconnect },
  )
  const client = {
    query: async () => ({
      success: true,
      data: { id: "order", paymentReference: "payment_123", billingOrderReference: "order_456" },
    }),
  } as unknown as ConvexHttpClient
  try {
    const preview = await adminTicketOrderGet({ token: "admin", orderId: "order" }, client)
    expect(preview).toMatchObject({ success: true, data: { stripeError: "Billing payment details returned HTTP 404" } })
    expect(targets[0]).toStartWith("http://127.0.0.1:3146/")

    process.env.EVENTOREN_BILLING_STRIPE_MODE = "live"
    const live = await adminTicketOrderGet({ token: "admin", orderId: "order" }, client)
    expect(live).toMatchObject({ success: true, data: { stripeError: "Billing payment details returned HTTP 404" } })
    expect(targets[1]).toStartWith("http://169.254.1.2:3146/")

    process.env.NODE_ENV = "production"
    process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
    const production = await adminTicketOrderGet({ token: "admin", orderId: "order" }, client)
    expect(production).toMatchObject({
      success: true,
      data: { stripeError: "Billing payment details returned HTTP 404" },
    })
    expect(new URL(targets[2]!).origin).toBe("http://169.254.1.2:3146")

    process.env.NODE_ENV = "development"
    process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.example.test"
    const foreignGateway = await adminTicketOrderGet({ token: "admin", orderId: "order" }, client)
    expect(foreignGateway).toMatchObject({
      success: true,
      data: { stripeError: "Billing payment details returned HTTP 404" },
    })
    expect(new URL(targets[3]!).origin).toBe("https://billing.example.test")
  } finally {
    globalThis.fetch = previous.fetch
    for (const [key, value] of [
      ["NODE_ENV", previous.nodeEnv],
      ["EVENTOREN_BILLING_BASE_URL", previous.baseUrl],
      ["EVENTOREN_BILLING_ORGANIZATION_ID", previous.organizationId],
      ["EVENTOREN_BILLING_API_CREDENTIAL", previous.credential],
      ["EVENTOREN_BILLING_STRIPE_MODE", previous.stripeMode],
      ["EVENTOREN_PUBLIC_BASE_URL", previous.publicBaseUrl],
    ] as const) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
