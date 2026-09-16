import { afterEach, expect, test } from "bun:test"
import { billingEventorenClient } from "../src/ticketing/convex/billingEventorenClient.ts"

afterEach(() => {
  delete process.env.EVENTOREN_BILLING_BASE_URL
  delete process.env.EVENTOREN_BILLING_ORGANIZATION_ID
  delete process.env.EVENTOREN_BILLING_API_CREDENTIAL
  delete process.env.EVENTOREN_BILLING_STRIPE_MODE
  delete process.env.EVENTOREN_PUBLIC_BASE_URL
})

function environmentSet() {
  process.env.EVENTOREN_BILLING_BASE_URL = "https://billing.test/"
  process.env.EVENTOREN_BILLING_ORGANIZATION_ID = "eventoren-test"
  process.env.EVENTOREN_BILLING_API_CREDENTIAL = "bapi_test"
  process.env.EVENTOREN_BILLING_STRIPE_MODE = "test"
  process.env.EVENTOREN_PUBLIC_BASE_URL = "https://eventoren.test"
}

function catalogResponse() {
  return new Response(
    JSON.stringify({
      success: true,
      data: { catalogVersion: 7, catalogDigest: "a".repeat(64), eventCount: 1, replayed: false },
    }),
    { status: 200 },
  )
}

function checkoutResponse(paymentReference: string) {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        paymentReference,
        orderReference: "billing-order-1",
        stripeMode: "test",
        status: "checkout_created",
        expiresAt: null,
        url: "https://checkout.stripe.test/session",
      },
    }),
    { status: 201 },
  )
}

function statusResponse(paymentReference: string, payment: "pending" | "expired" = "pending") {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        paymentReference,
        orderReference: "billing-order-1",
        stripeMode: "test",
        status: payment === "expired" ? "expired" : "checkout_created",
        payment,
        expiresAt: null,
      },
    }),
    { status: 200 },
  )
}

function checkoutInput() {
  return {
    organizationId: "eventoren-test",
    paymentReference: "payment_checkoutkey123456789012345678901234",
    eventKey: "event-1",
    catalogVersion: 7,
    tickets: [{ tierKey: "standard", quantity: 1 }],
    stripeMode: "test" as const,
    successUrl: "https://eventoren.test/checkout/success",
    cancelUrl: "https://eventoren.test/checkout/cancel",
    locale: "de" as const,
    customer: { email: "buyer@example.com" },
    legalContext: {
      cta: "Kostenpflichtig buchen",
      termsAccepted: true as const,
      privacyAcknowledged: true as const,
      documentSetRevision: `sha256:${"a".repeat(64)}`,
    },
  }
}

test("adapts catalog, checkout, status, and expiration through the packaged Billing client", async () => {
  environmentSet()
  const requests: { url: string; init?: RequestInit }[] = []
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init })
    const url = new URL(String(input))
    if (url.pathname.endsWith("/catalog")) return catalogResponse()
    if (url.pathname.endsWith("/ticket-checkout")) {
      const body = JSON.parse(String(init?.body)) as { paymentReference: string }
      return checkoutResponse(body.paymentReference)
    }
    if (url.pathname.endsWith("/status")) return statusResponse("payment_checkoutkey123456789012345678901234")
    if (url.pathname.endsWith("/expire"))
      return statusResponse("payment_checkoutkey123456789012345678901234", "expired")
    return new Response(null, { status: 404 })
  }
  const config = billingEventorenClient.configRead({ fetcher })
  expect(config.success).toBe(true)
  if (!config.success) return

  const catalog = await billingEventorenClient.catalogPush(config.data, {
    organizationId: "eventoren-test",
    catalogVersion: 7,
    events: [
      {
        eventKey: "event-1",
        title: "Event",
        subtitle: "",
        description: "Description",
        category: "konzerte",
        startsAt: "2027-01-01T18:00:00.000Z",
        endsAt: "2027-01-01T22:00:00.000Z",
        doorsAt: "2027-01-01T17:00:00.000Z",
        venue: "Hall",
        city: "Berlin",
        address: "Street 1",
        organizer: "Eventoren",
        imageUrl: "https://eventoren.test/event.jpg",
        imageAlt: "Event",
        tags: [],
        status: "published",
        catalogVersion: 7,
        tiers: [
          {
            tierKey: "standard",
            name: "Standard",
            description: "Admission",
            priceCents: 2500,
            feeCents: 250,
            capacity: 100,
            reserved: 0,
            sold: 0,
            sortOrder: 0,
            catalogVersion: 7,
          },
        ],
      },
    ],
  })
  const checkout = await billingEventorenClient.ticketCheckoutCreate(config.data, checkoutInput())
  const status = await billingEventorenClient.statusGet(config.data, "payment_checkoutkey123456789012345678901234")
  const expiration = await billingEventorenClient.ticketCheckoutExpire(
    config.data,
    "payment_checkoutkey123456789012345678901234",
  )

  expect(catalog).toMatchObject({ success: true, data: { catalogVersion: 7, eventCount: 1 } })
  expect(checkout).toMatchObject({ success: true, data: { status: "checkout_created", url: expect.any(String) } })
  expect(status).toMatchObject({ success: true, data: { kind: "status", data: { payment: "pending" } } })
  expect(expiration).toMatchObject({ success: true, data: { kind: "status", data: { payment: "expired" } } })
  expect(requests).toHaveLength(4)
  expect(requests[0]?.url).toBe("https://billing.test/api/checkout/organizations/eventoren/catalog")
  expect(requests[0]?.init).toMatchObject({
    method: "POST",
    headers: {
      Authorization: "Bearer bapi_test",
      "Content-Type": "application/json; charset=UTF-8",
    },
  })
  expect(requests[0]?.init?.signal).toBeInstanceOf(AbortSignal)
  expect(JSON.parse(String(requests[1]?.init?.body))).toMatchObject({
    organizationId: "eventoren-test",
    paymentReference: "payment_checkoutkey123456789012345678901234",
  })
  expect(requests[2]?.url).toContain("/status?organizationId=eventoren-test")
  expect(requests[3]?.url).toContain("/expire?organizationId=eventoren-test")
})

test("preserves 404 semantics and normalizes Billing transport errors", async () => {
  environmentSet()
  let mode: "not-found" | "server-error" | "invalid" = "not-found"
  const fetcher = async () => {
    if (mode === "not-found") return new Response("missing", { status: 404 })
    if (mode === "server-error") return new Response("temporary", { status: 503 })
    return new Response(JSON.stringify({ success: true, data: { paymentReference: "wrong" } }), { status: 200 })
  }
  const config = billingEventorenClient.configRead({ fetcher })
  expect(config.success).toBe(true)
  if (!config.success) return

  const notFoundStatus = await billingEventorenClient.statusGet(
    config.data,
    "payment_checkoutkey123456789012345678901234",
  )
  const notFoundExpiration = await billingEventorenClient.ticketCheckoutExpire(
    config.data,
    "payment_checkoutkey123456789012345678901234",
  )
  expect(notFoundStatus).toEqual({ success: true, data: { kind: "not_found" } })
  expect(notFoundExpiration).toEqual({ success: true, data: { kind: "not_found" } })

  mode = "server-error"
  const serverError = await billingEventorenClient.catalogPush(config.data, {
    organizationId: "eventoren-test",
    catalogVersion: 1,
    events: [],
  })
  expect(serverError).toMatchObject({ success: false, errorMessage: "Billing request returned HTTP 503" })

  mode = "invalid"
  const invalidStatus = await billingEventorenClient.statusGet(
    config.data,
    "payment_checkoutkey123456789012345678901234",
  )
  expect(invalidStatus).toMatchObject({ success: false, errorMessage: "Billing returned an invalid payment status" })
})
