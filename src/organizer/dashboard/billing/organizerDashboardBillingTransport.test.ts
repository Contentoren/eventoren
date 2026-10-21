import { describe, expect, test } from "bun:test"
import {
  organizerDashboardBillingConfigRead,
  organizerDashboardBillingInvoicePdfGet,
  organizerDashboardBillingInvoiceResend,
  organizerDashboardBillingInvoiceStatusGet,
  organizerDashboardBillingRefundRequest,
  organizerDashboardBillingRefundStatusGet,
} from "./organizerDashboardBillingTransport.ts"

const config = { baseUrl: "https://billing.example.org", organizationId: "org_1", apiCredential: "secret-credential" }
const scope = { paymentReference: "payment_abc", orderReference: "order_ABC123", stripeMode: "test" as const }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

const refundBody = {
  success: true,
  data: {
    paymentReference: "payment_abc",
    orderReference: "order_ABC123",
    stripeMode: "test",
    refundReference: "refund_1",
    amountCents: 500,
    currency: "EUR",
    status: "succeeded",
    creditNoteStatus: "awaiting_accounting",
    refundedAmountCents: 500,
    remainingAmountCents: 600,
    createdAt: "2026-10-21T10:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
  },
} as const

const invoiceBody = {
  success: true,
  data: {
    paymentReference: "payment_abc",
    orderReference: "order_ABC123",
    stripeMode: "test",
    invoiceStatus: "invoice_created",
    invoiceNumber: "RE-2026-001",
    pdfAvailable: true,
    emailStatus: "sent",
    emailSentAt: "2026-10-21T10:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
  },
} as const

describe("organizerDashboardBillingConfigRead", () => {
  test("rejects incomplete configuration without leaking values", () => {
    for (const env of [
      {},
      { EVENTOREN_BILLING_BASE_URL: "https://billing.example.org" },
      {
        EVENTOREN_BILLING_BASE_URL: "https://billing.example.org",
        EVENTOREN_BILLING_ORGANIZATION_ID: "org_1",
      },
    ]) {
      const result = organizerDashboardBillingConfigRead(env)
      expect(result.success).toBe(false)
      if (!result.success) expect(result.errorMessage).not.toContain("secret-credential")
    }
  })

  test("rejects invalid and non-http base URLs", () => {
    for (const baseUrl of ["not-a-url", "ftp://billing.example.org", ""]) {
      const result = organizerDashboardBillingConfigRead({
        EVENTOREN_BILLING_BASE_URL: baseUrl,
        EVENTOREN_BILLING_ORGANIZATION_ID: "org_1",
        EVENTOREN_BILLING_API_CREDENTIAL: "secret-credential",
      })
      expect(result.success).toBe(false)
    }
  })

  test("accepts complete configuration", () => {
    const result = organizerDashboardBillingConfigRead({
      EVENTOREN_BILLING_BASE_URL: "https://billing.example.org/",
      EVENTOREN_BILLING_ORGANIZATION_ID: "org_1",
      EVENTOREN_BILLING_API_CREDENTIAL: "secret-credential",
    })
    expect(result).toEqual({
      success: true,
      data: { baseUrl: "https://billing.example.org", organizationId: "org_1", apiCredential: "secret-credential" },
    })
  })
})

describe("organizer dashboard billing transport", () => {
  test("invoice status uses the exact billing path, auth, and scope query", async () => {
    const seen: { url: string; init: RequestInit }[] = []
    const result = await organizerDashboardBillingInvoiceStatusGet(config, scope, (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      seen.push({ url: String(url), init: init ?? {} })
      return jsonResponse(invoiceBody)
    }) as unknown as typeof fetch)
    expect(result).toEqual({ success: true, data: invoiceBody.data })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.url).toBe(
      "https://billing.example.org/api/checkout/organizations/eventoren/ticket-checkout/payment_abc/invoice/status?orderReference=order_ABC123&stripeMode=test&organizationId=org_1",
    )
    const headers = new Headers(seen[0]?.init.headers)
    expect(headers.get("authorization")).toBe("Bearer secret-credential")
    expect(seen[0]?.init.method).toBe("GET")
  })

  test("invoice status refuses a mismatched projection", async () => {
    const result = await organizerDashboardBillingInvoiceStatusGet(config, scope, (async () =>
      jsonResponse({
        ...invoiceBody,
        data: { ...invoiceBody.data, orderReference: "order_OTHER" },
      })) as unknown as typeof fetch)
    expect(result.success).toBe(false)
  })

  test("invoice status surfaces HTTP failures honestly", async () => {
    for (const status of [404, 409, 500]) {
      const result = await organizerDashboardBillingInvoiceStatusGet(
        config,
        scope,
        (async () => new Response("nope", { status })) as unknown as typeof fetch,
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorMessage).toContain(String(status))
        expect(result.errorMessage).not.toContain("secret-credential")
      }
    }
  })

  test("invoice PDF returns bytes only for real PDFs", async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46])
    const ok = await organizerDashboardBillingInvoicePdfGet(
      config,
      scope,
      (async () =>
        new Response(bytes, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        })) as unknown as typeof fetch,
    )
    expect(ok).toEqual({ success: true, data: bytes })

    const notFound = await organizerDashboardBillingInvoicePdfGet(
      config,
      scope,
      (async () => new Response("missing", { status: 404 })) as unknown as typeof fetch,
    )
    expect(notFound.success).toBe(false)
    if (!notFound.success) expect(notFound.errorMessage).toContain("No invoice is available")

    const draft = await organizerDashboardBillingInvoicePdfGet(
      config,
      scope,
      (async () => new Response("draft", { status: 409 })) as unknown as typeof fetch,
    )
    expect(draft.success).toBe(false)
    if (!draft.success) expect(draft.errorMessage).toContain("No invoice PDF is available")

    const html = await organizerDashboardBillingInvoicePdfGet(
      config,
      scope,
      (async () =>
        new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch,
    )
    expect(html.success).toBe(false)
  })

  test("invoice resend posts the idempotent command body", async () => {
    const seen: { url: string; init: RequestInit }[] = []
    const result = await organizerDashboardBillingInvoiceResend(
      config,
      { ...scope, idempotencyKey: "resend_1" },
      (async (url: string | URL | Request, init?: RequestInit) => {
        seen.push({ url: String(url), init: init ?? {} })
        return jsonResponse(invoiceBody)
      }) as unknown as typeof fetch,
    )
    expect(result).toEqual({ success: true, data: invoiceBody.data })
    expect(seen[0]?.url).toBe(
      "https://billing.example.org/api/checkout/organizations/eventoren/ticket-checkout/payment_abc/invoice/resend?organizationId=org_1",
    )
    expect(seen[0]?.init.method).toBe("POST")
    expect(JSON.parse(String(seen[0]?.init.body))).toEqual({
      paymentReference: "payment_abc",
      orderReference: "order_ABC123",
      stripeMode: "test",
      idempotencyKey: "resend_1",
      organizationId: "org_1",
    })
  })

  test("refund request posts the exact billing body and matches the echo", async () => {
    const seen: { url: string; init: RequestInit }[] = []
    const result = await organizerDashboardBillingRefundRequest(
      config,
      {
        ...scope,
        refundReference: "refund_1",
        idempotencyKey: "idem_1",
        currency: "EUR",
        amountCents: 500,
        reason: "Doppelte Buchung",
      },
      (async (url: string | URL | Request, init?: RequestInit) => {
        seen.push({ url: String(url), init: init ?? {} })
        return jsonResponse(refundBody)
      }) as unknown as typeof fetch,
    )
    expect(result).toEqual({ success: true, data: refundBody.data })
    expect(seen[0]?.url).toBe(
      "https://billing.example.org/api/checkout/organizations/eventoren/ticket-checkout/payment_abc/refunds?organizationId=org_1",
    )
    const body = JSON.parse(String(seen[0]?.init.body))
    expect(body).toEqual({
      paymentReference: "payment_abc",
      orderReference: "order_ABC123",
      stripeMode: "test",
      refundReference: "refund_1",
      idempotencyKey: "idem_1",
      currency: "EUR",
      amountCents: 500,
      reason: "Doppelte Buchung",
      organizationId: "org_1",
    })
  })

  test("refund request refuses an amount echo mismatch", async () => {
    const result = await organizerDashboardBillingRefundRequest(
      config,
      {
        ...scope,
        refundReference: "refund_1",
        idempotencyKey: "idem_1",
        currency: "EUR",
        amountCents: 500,
        reason: "Doppelte Buchung",
      },
      (async () =>
        jsonResponse({ ...refundBody, data: { ...refundBody.data, amountCents: 600 } })) as unknown as typeof fetch,
    )
    expect(result.success).toBe(false)
  })

  test("refund status polls the exact durable status path", async () => {
    const seen: string[] = []
    const result = await organizerDashboardBillingRefundStatusGet(
      config,
      { ...scope, refundReference: "refund_1" },
      (async (url: string | URL | Request) => {
        seen.push(String(url))
        return jsonResponse(refundBody)
      }) as unknown as typeof fetch,
    )
    expect(result).toEqual({ success: true, data: refundBody.data })
    expect(seen[0]).toBe(
      "https://billing.example.org/api/checkout/organizations/eventoren/ticket-checkout/payment_abc/refunds/refund_1/status?orderReference=order_ABC123&stripeMode=test&organizationId=org_1",
    )
  })

  test("network failures never leak the credential", async () => {
    const failing = (async () => {
      throw new Error("connection refused for secret-credential")
    }) as unknown as typeof fetch
    for (const result of [
      await organizerDashboardBillingInvoiceStatusGet(config, scope, failing),
      await organizerDashboardBillingRefundStatusGet(config, { ...scope, refundReference: "refund_1" }, failing),
    ]) {
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errorMessage).toBe("Billing request failed")
        expect(result.errorMessage).not.toContain("secret-credential")
      }
    }
  })
})
