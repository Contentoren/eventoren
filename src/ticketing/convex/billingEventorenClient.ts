import type { BillingClient } from "billing/billingClient"
import type { BillingClientCreateOptions } from "billing/billingClientCreateOptions"
import { billingClientCreate } from "billing"
import type { EventorenCatalogUpsertRequest } from "billing/contracts/eventorenCatalogUpsertRequestSchema"
import type { EventorenCatalogUpsertResponse } from "billing/contracts/eventorenCatalogUpsertResponseSchema"
import type { EventorenTicketCheckoutCreateRequest } from "billing/contracts/eventorenTicketCheckoutCreateRequestSchema"
import type { EventorenTicketCheckoutCreateResponse } from "billing/contracts/eventorenTicketCheckoutCreateResponseSchema"
import type { EventorenTicketCheckoutStatusResponse } from "billing/contracts/eventorenTicketCheckoutStatusResponseSchema"
import type { EventorenTicketFulfillmentPrepareRequest } from "billing/contracts/eventorenTicketFulfillmentPrepareRequestSchema"
import type { EventorenTicketFulfillmentPrepareResponse } from "billing/contracts/eventorenTicketFulfillmentPrepareResponseSchema"
import type { EventorenTicketPaymentDetailsResponse } from "billing/contracts/eventorenTicketPaymentDetailsResponseSchema"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import { ticketCheckoutFulfillmentActivationIsEnabled } from "./ticketCheckoutFulfillmentActivationIsEnabled.js"

type BillingEventorenFetcher = NonNullable<BillingClientCreateOptions["fetcher"]>

type BillingEventorenConfigOptions = {
  fetcher?: BillingEventorenFetcher
  baseUrl?: string
}

type BillingEventorenConfig = {
  baseUrl: string
  organizationId: string
  apiCredential: string
  stripeMode: "live" | "test"
  publicBaseUrl: string
  fulfillmentEnabled: boolean
  client: BillingClient
}

type BillingCheckoutCreated = Omit<EventorenTicketCheckoutCreateResponse["data"], "expiresAt" | "status" | "url"> & {
  status: "checkout_created"
  url: string
}

type BillingStatusLookup =
  | { kind: "not_found" }
  | { kind: "status"; data: EventorenTicketCheckoutStatusResponse["data"] }

export const billingEventorenClient = {
  configRead(options: BillingEventorenConfigOptions = {}): Result<BillingEventorenConfig> {
    const op = "billingEventorenConfigRead"
    const baseUrl = (options.baseUrl ?? process.env.EVENTOREN_BILLING_BASE_URL)?.trim().replace(/\/$/u, "")
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

    const fetcher = options.fetcher ?? globalThis.fetch
    const clientResult = billingClientCreate({
      baseUrl,
      organizationBearerCredential: apiCredential,
      fetcher: async (input, init) =>
        fetcher(billingRequestTargetNormalize(input, init?.method), billingRequestInitNormalize(init)),
      timeoutMilliseconds: 15_000,
    })
    if (!clientResult.success) return createResultError(op, clientResult.errorMessage, clientResult.errorData)
    return createResult({
      baseUrl,
      organizationId,
      apiCredential,
      stripeMode,
      publicBaseUrl,
      fulfillmentEnabled: ticketCheckoutFulfillmentActivationIsEnabled(organizationId),
      client: clientResult.data,
    })
  },

  async catalogPush(
    config: BillingEventorenConfig,
    payload: EventorenCatalogUpsertRequest,
  ): PromiseResult<EventorenCatalogUpsertResponse["data"]> {
    const result = await config.client.eventorenCatalogUpsert(payload)
    if (!result.success)
      return billingOperationError(
        "billingEventorenCatalogPush",
        result,
        "Billing request returned HTTP",
        "Billing returned an invalid response",
        "Billing request failed",
      )
    return createResult(result.data)
  },

  async ticketCheckoutCreate(
    config: BillingEventorenConfig,
    input: EventorenTicketCheckoutCreateRequest,
  ): PromiseResult<BillingCheckoutCreated> {
    const result = await config.client.eventorenTicketCheckoutCreate(input)
    if (!result.success)
      return billingOperationError(
        "billingEventorenTicketCheckoutCreate",
        result,
        "Billing request returned HTTP",
        "Billing returned an invalid response",
        "Billing request failed",
      )
    if (result.data.status !== "checkout_created" || result.data.url === undefined)
      return createResultError("billingEventorenTicketCheckoutCreate", "Billing returned an invalid response")
    return createResult({
      paymentReference: result.data.paymentReference,
      orderReference: result.data.orderReference,
      stripeMode: result.data.stripeMode,
      status: "checkout_created",
      url: result.data.url,
    })
  },

  async statusGet(config: BillingEventorenConfig, paymentReference: string): PromiseResult<BillingStatusLookup> {
    const result = await config.client.eventorenTicketCheckoutStatusGet({
      organizationId: config.organizationId,
      paymentReference,
    })
    if (!result.success) {
      if (result.statusCode === 404) return createResult({ kind: "not_found" as const })
      return billingOperationError(
        "billingEventorenStatusGet",
        result,
        "Billing status returned HTTP",
        "Billing returned an invalid payment status",
        "Billing status request failed",
      )
    }
    return createResult({ kind: "status" as const, data: result.data })
  },

  async ticketCheckoutExpire(
    config: BillingEventorenConfig,
    paymentReference: string,
  ): PromiseResult<BillingStatusLookup> {
    const result = await config.client.eventorenTicketCheckoutExpire({
      organizationId: config.organizationId,
      paymentReference,
    })
    if (!result.success) {
      if (result.statusCode === 404) return createResult({ kind: "not_found" as const })
      return billingOperationError(
        "billingEventorenTicketCheckoutExpire",
        result,
        "Billing expiration returned HTTP",
        "Billing returned an invalid expiration status",
        "Billing expiration request failed",
      )
    }
    return createResult({ kind: "status" as const, data: result.data })
  },

  async ticketFulfillmentPrepare(
    config: BillingEventorenConfig,
    input: EventorenTicketFulfillmentPrepareRequest,
  ): PromiseResult<EventorenTicketFulfillmentPrepareResponse["data"]> {
    const result = await config.client.eventorenTicketFulfillmentPrepare(input)
    if (!result.success)
      return billingOperationError(
        "billingEventorenTicketFulfillmentPrepare",
        result,
        "Billing fulfillment returned HTTP",
        "Billing returned an invalid fulfillment response",
        "Billing fulfillment request failed",
      )
    return createResult(result.data)
  },

  async ticketPaymentDetailsGet(
    config: BillingEventorenConfig,
    input: { readonly paymentReference: string; readonly orderReference: string },
  ): PromiseResult<EventorenTicketPaymentDetailsResponse["data"]> {
    const op = "billingEventorenTicketPaymentDetailsGet"
    try {
      const result = await config.client.eventorenTicketPaymentDetailsGet({
        ...input,
        organizationId: config.organizationId,
      })
      if (!result.success)
        return billingOperationError(
          op,
          result,
          "Billing payment details returned HTTP",
          "Billing returned invalid payment details",
          "Billing payment details request failed",
        )
      return createResult(result.data)
    } catch {
      return createResultError(op, "Billing payment details request failed")
    }
  },
}

function billingOperationError(
  op: string,
  result: {
    success: false
    code?: string
    errorMessage: string
    errorData?: string | null
    statusCode?: number
  },
  httpMessage: string,
  invalidMessage: string,
  networkMessage: string,
) {
  if (result.statusCode !== undefined && result.statusCode >= 300)
    return createResultError(op, `${httpMessage} ${result.statusCode}`, result.errorData)
  if (result.code === "BILLING_CLIENT_INVALID_RESPONSE") return createResultError(op, invalidMessage, result.errorData)
  if (result.code === "BILLING_CLIENT_NETWORK_ERROR") return createResultError(op, networkMessage, result.errorData)
  return createResultError(op, result.errorMessage, result.errorData)
}

function billingRequestInitNormalize(init: RequestInit | undefined): RequestInit | undefined {
  if (init?.headers === undefined) return init
  const headers = new Headers(init.headers)
  const normalizedHeaders: Record<string, string> = {}
  const authorization = headers.get("authorization")
  const contentType = headers.get("content-type")
  const accept = headers.get("accept")
  if (authorization !== null) normalizedHeaders.Authorization = authorization
  if (contentType !== null) normalizedHeaders["Content-Type"] = contentType
  if (accept !== null) normalizedHeaders.Accept = accept
  return { ...init, headers: normalizedHeaders }
}

function billingRequestTargetNormalize(input: RequestInfo | URL, method: string | undefined): RequestInfo | URL {
  if (method !== "POST") return input
  const target = new URL(String(input))
  if (
    !target.pathname.endsWith("/catalog") &&
    !target.pathname.endsWith("/ticket-checkout") &&
    !target.pathname.endsWith("/ticket-fulfillment") &&
    !target.pathname.endsWith("/payment-details")
  )
    return input
  target.search = ""
  return target.toString()
}
