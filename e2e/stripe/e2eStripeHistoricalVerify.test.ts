import { expect, test } from "@rstest/core"
import { e2eStripeTestClientCreate } from "./e2eStripeTestClientCreate.ts"
import { e2eStripeHistoricalVerify } from "./e2eStripeHistoricalVerify.ts"

const org = "org_test"
const eventKey = "ticket-e2e-mold-12345678-1234-1234-1234-123456789abc"

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

function verifyFixture(options: { open?: boolean; activeSub?: boolean } = {}) {
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const parsed = new URL(String(url))
    const path = parsed.pathname.replace("/v1/", "")
    let body: unknown
    if (path === "account") body = { id: "acct_test" }
    if (path === "checkout/sessions")
      body = {
        data: [
          {
            id: "cs_test_hist",
            livemode: false,
            mode: "payment",
            status: options.open === false ? "expired" : "open",
            payment_status: "unpaid",
            customer: "cus_hist",
            subscription: null,
            metadata: ownedMetadata(),
          },
        ],
        has_more: false,
      }
    if (path === "subscriptions")
      body = {
        data: options.activeSub
          ? [{ id: "sub_hist", livemode: false, customer: "cus_hist", status: "active", metadata: ownedMetadata() }]
          : [],
        has_more: false,
      }
    return Response.json(body ?? {}, { status: body ? 200 : 404 })
  }) as typeof fetch
  return e2eStripeTestClientCreate("sk_test_hist123", fetcher)
}

test("fails verification while disposable open sessions remain, passes after expiration", async () => {
  const open = await e2eStripeHistoricalVerify({
    candidates: [{ eventKey, kind: "ticket-e2e" }],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe: verifyFixture({ open: true }),
  })
  expect(open.success).toBe(false)
  if (open.success) throw new Error("expected failure")
  expect(open.errorMessage).toMatch(/open sessions/)

  const absent = await e2eStripeHistoricalVerify({
    candidates: [{ eventKey, kind: "ticket-e2e" }],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe: verifyFixture({ open: false }),
  })
  expect(absent).toMatchObject({ success: true, data: { status: "stripe-historical-absent" } })
})

test("fails verification while disposable active subscriptions remain, ignoring financial history", async () => {
  const residual = await e2eStripeHistoricalVerify({
    candidates: [{ eventKey, kind: "ticket-e2e" }],
    organizationId: org,
    accountId: "acct_test",
    key: "sk_test_hist123",
    stripe: verifyFixture({ open: false, activeSub: true }),
  })
  expect(residual.success).toBe(false)
  if (residual.success) throw new Error("expected failure")
  expect(residual.errorMessage).toMatch(/active subscriptions/)
})

test("returns no-fixture verification for catalog-only legacy kinds", async () => {
  const result = await e2eStripeHistoricalVerify({
    candidates: [{ eventKey: "readiness-technical-draft-20260914", kind: "readiness" }],
    organizationId: "",
    accountId: "",
    key: "",
    stripe: verifyFixture(),
  })
  expect(result).toMatchObject({ success: true, data: { status: "stripe-historical-absent" } })
})
