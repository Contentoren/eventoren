import * as v from "valibot"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"

const billingCatalogResponseSchema = v.object({
  success: v.literal(true),
  data: v.object({
    catalogVersion: v.number(),
    catalogDigest: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/)),
    eventCount: v.number(),
    replayed: v.boolean(),
  }),
})

const billingCheckoutResponseSchema = v.object({
  success: v.literal(true),
  data: v.object({
    paymentReference: v.string(),
    orderReference: v.string(),
    stripeMode: v.picklist(["live", "test"]),
    status: v.literal("checkout_created"),
    url: v.pipe(v.string(), v.url()),
  }),
})

const billingStatusResponseSchema = v.object({
  success: v.literal(true),
  data: v.object({
    paymentReference: v.string(),
    orderReference: v.string(),
    stripeMode: v.picklist(["live", "test"]),
    status: v.picklist(["accepted", "checkout_created", "failed", "expired"]),
    payment: v.picklist(["pending", "paid", "failed", "expired"]),
    expiresAt: v.nullable(v.string()),
  }),
})

type BillingEventorenConfig = {
  baseUrl: string
  organizationId: string
  apiCredential: string
  stripeMode: "live" | "test"
  publicBaseUrl: string
}

type BillingCatalogPayload = {
  organizationId: string
  catalogVersion: number
  events: readonly Record<string, unknown>[]
}

type BillingTicketCheckoutInput = {
  organizationId: string
  paymentReference: string
  eventKey: string
  catalogVersion: number
  tickets: readonly { tierKey: string; quantity: number }[]
  stripeMode: "live" | "test"
  successUrl: string
  cancelUrl: string
  locale: "de" | "en"
  customer: { email: string }
  legalContext: {
    cta: string
    termsAccepted: true
    privacyAcknowledged: true
    documentSetRevision: string
  }
}

type BillingStatus = {
  paymentReference: string
  orderReference: string
  stripeMode: "live" | "test"
  status: "accepted" | "checkout_created" | "failed" | "expired"
  payment: "pending" | "paid" | "failed" | "expired"
  expiresAt: string | null
}

type BillingStatusLookup = { kind: "not_found" } | { kind: "status"; data: BillingStatus }

export const billingEventorenClient = {
  configRead(): Result<BillingEventorenConfig> {
    const op = "billingEventorenConfigRead"
    const baseUrl = process.env.EVENTOREN_BILLING_BASE_URL?.trim().replace(/\/$/u, "")
    const organizationId = process.env.EVENTOREN_BILLING_ORGANIZATION_ID?.trim()
    const apiCredential = process.env.EVENTOREN_BILLING_API_CREDENTIAL?.trim()
    const stripeMode = process.env.EVENTOREN_BILLING_STRIPE_MODE?.trim()
    const publicBaseUrl = process.env.EVENTOREN_PUBLIC_BASE_URL?.trim().replace(/\/$/u, "")
    if (!baseUrl || !organizationId || !apiCredential || !publicBaseUrl)
      return createResultError(op, "Billing checkout configuration is incomplete")
    if (stripeMode !== "live" && stripeMode !== "test")
      return createResultError(op, "EVENTOREN_BILLING_STRIPE_MODE must be live or test")
    try {
      new URL(baseUrl)
      new URL(publicBaseUrl)
    } catch {
      return createResultError(op, "Billing and public base URLs must be valid URLs")
    }
    return createResult({
      baseUrl,
      organizationId,
      apiCredential,
      stripeMode,
      publicBaseUrl,
    })
  },

  async catalogPush(
    config: BillingEventorenConfig,
    payload: BillingCatalogPayload,
  ): PromiseResult<{
    catalogVersion: number
    catalogDigest: string
    replayed: boolean
  }> {
    const result = await billingJsonPost(config, "/api/checkout/organizations/eventoren/catalog", payload)
    if (!result.success) return result
    const parsed = v.safeParse(billingCatalogResponseSchema, result.data)
    if (!parsed.success) return createResultError("billingEventorenCatalogPush", "Billing returned an invalid response")
    return createResult(parsed.output.data)
  },

  async ticketCheckoutCreate(
    config: BillingEventorenConfig,
    input: BillingTicketCheckoutInput,
  ): PromiseResult<{
    paymentReference: string
    orderReference: string
    stripeMode: "live" | "test"
    status: "checkout_created"
    url: string
  }> {
    const result = await billingJsonPost(config, "/api/checkout/organizations/eventoren/ticket-checkout", input)
    if (!result.success) return result
    const parsed = v.safeParse(billingCheckoutResponseSchema, result.data)
    if (!parsed.success)
      return createResultError("billingEventorenTicketCheckoutCreate", "Billing returned an invalid response")
    return createResult(parsed.output.data)
  },

  async statusGet(config: BillingEventorenConfig, paymentReference: string): PromiseResult<BillingStatusLookup> {
    const op = "billingEventorenStatusGet"
    try {
      const response = await fetch(
        `${config.baseUrl}/api/checkout/organizations/dynamic/${encodeURIComponent(paymentReference)}/status?organizationId=${encodeURIComponent(config.organizationId)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${config.apiCredential}` },
          signal: AbortSignal.timeout(15_000),
        },
      )
      const body = await response.json().catch(() => null)
      if (response.status === 404) return createResult({ kind: "not_found" as const })
      if (!response.ok) return createResultError(op, `Billing status returned HTTP ${response.status}`)
      const parsed = v.safeParse(billingStatusResponseSchema, body)
      if (!parsed.success) return createResultError(op, "Billing returned an invalid payment status")
      return createResult({ kind: "status" as const, data: parsed.output.data })
    } catch (error) {
      return createResultError(op, "Billing status request failed", String(error))
    }
  },

  async ticketCheckoutExpire(
    config: BillingEventorenConfig,
    paymentReference: string,
  ): PromiseResult<BillingStatusLookup> {
    const op = "billingEventorenTicketCheckoutExpire"
    try {
      const response = await fetch(
        `${config.baseUrl}/api/checkout/organizations/eventoren/ticket-checkout/${encodeURIComponent(paymentReference)}/expire?organizationId=${encodeURIComponent(config.organizationId)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiCredential}` },
          signal: AbortSignal.timeout(15_000),
        },
      )
      const body = await response.json().catch(() => null)
      if (response.status === 404) return createResult({ kind: "not_found" as const })
      if (!response.ok) return createResultError(op, `Billing expiration returned HTTP ${response.status}`)
      const parsed = v.safeParse(billingStatusResponseSchema, body)
      if (!parsed.success) return createResultError(op, "Billing returned an invalid expiration status")
      return createResult({ kind: "status" as const, data: parsed.output.data })
    } catch (error) {
      return createResultError(op, "Billing expiration request failed", String(error))
    }
  },
}

async function billingJsonPost(config: BillingEventorenConfig, path: string, body: unknown): PromiseResult<unknown> {
  const op = "billingEventorenRequest"
  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiCredential}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify(body),
    })
    const responseBody = await response.json().catch(() => null)
    if (!response.ok) return createResultError(op, `Billing request returned HTTP ${response.status}`)
    return createResult(responseBody)
  } catch (error) {
    return createResultError(op, "Billing request failed", String(error))
  }
}
