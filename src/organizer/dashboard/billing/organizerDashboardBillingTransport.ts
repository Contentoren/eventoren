import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import {
  organizerDashboardBillingInvoiceResendRequestSchema,
  organizerDashboardBillingRefundRequestSchema,
  organizerDashboardBillingRefundStatusSchema,
  type organizerDashboardBillingInvoiceResendResponseSchema,
  type organizerDashboardBillingInvoiceStatusResponseSchema,
  organizerDashboardBillingInvoiceStatusResponseSchema as invoiceStatusResponseSchema,
  organizerDashboardBillingInvoiceResendResponseSchema as invoiceResendResponseSchema,
  organizerDashboardBillingInvoiceRequestSchema,
  type OrganizerDashboardBillingInvoiceResendResponse,
  type OrganizerDashboardBillingInvoiceStatusResponse,
  type OrganizerDashboardBillingRefundStatus,
} from "./organizerDashboardBillingSchemas.ts"

export type OrganizerDashboardBillingFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export type OrganizerDashboardBillingConfig = {
  readonly baseUrl: string
  readonly organizationId: string
  readonly apiCredential: string
}

const op = "organizerDashboardBillingTransport"
const timeoutMilliseconds = 15_000

/**
 * Thin typed transport to the real billing service. Paths and query/body
 * shapes are copied from the billing client in billing commit a6959c7
 * (`src/billing-client/checkout/eventorenTicket*.ts`); no URL is invented
 * here and no semesterkur booking method is reused. The organization,
 * payment, order, and Stripe mode always come from the persisted checkout
 * context resolved by the caller (the dashboard order row), never from
 * interface input.
 */
export function organizerDashboardBillingConfigRead(
  env: Record<string, string | undefined> = process.env,
): Result<OrganizerDashboardBillingConfig> {
  const baseUrl = env.EVENTOREN_BILLING_BASE_URL?.trim().replace(/\/$/u, "")
  const organizationId = env.EVENTOREN_BILLING_ORGANIZATION_ID?.trim()
  const apiCredential = env.EVENTOREN_BILLING_API_CREDENTIAL?.trim()
  if (!baseUrl || !organizationId || !apiCredential) return createResultError(op, "Billing configuration is incomplete")
  try {
    const parsed = new URL(baseUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return createResultError(op, "Billing base URL must be an http(s) URL")
  } catch {
    return createResultError(op, "Billing base URL is invalid")
  }
  return createResult({ baseUrl, organizationId, apiCredential })
}

function billingHeaders(config: OrganizerDashboardBillingConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.apiCredential}`,
    Accept: "application/json",
  }
}

async function billingFetchJson<T>(
  fetcher: OrganizerDashboardBillingFetch,
  url: string,
  init: RequestInit,
  schema: v.GenericSchema,
  failureOp: string,
  httpMessage: string,
): Promise<Result<T>> {
  let response: Response
  try {
    response = await fetcher(url, { ...init, signal: AbortSignal.timeout(timeoutMilliseconds) })
  } catch {
    return createResultError(failureOp, "Billing request failed")
  }
  if (!response.ok) return createResultError(failureOp, `${httpMessage} ${response.status}`)
  let body: unknown
  try {
    body = (await response.json()) as unknown
  } catch {
    return createResultError(failureOp, "Billing returned an invalid response")
  }
  const parsed = v.safeParse(schema, body)
  if (!parsed.success) return createResultError(failureOp, "Billing returned an invalid response")
  return createResult(parsed.output as T)
}

type InvoiceScope = v.InferOutput<typeof organizerDashboardBillingInvoiceRequestSchema>
type RefundInput = v.InferOutput<typeof organizerDashboardBillingRefundRequestSchema> & {
  readonly organizationId?: string
}
type ResendInput = v.InferOutput<typeof organizerDashboardBillingInvoiceResendRequestSchema> & {
  readonly organizationId?: string
}

function invoiceQuery(config: OrganizerDashboardBillingConfig, scope: InvoiceScope): string {
  const query = new URLSearchParams({
    orderReference: scope.orderReference,
    stripeMode: scope.stripeMode,
    organizationId: config.organizationId,
  })
  return query.toString()
}

function scopeEchoCheck(
  failureOp: string,
  expected: InvoiceScope,
  actual: InvoiceScope,
  message: string,
): Result<null> {
  if (
    actual.paymentReference !== expected.paymentReference ||
    actual.orderReference !== expected.orderReference ||
    actual.stripeMode !== expected.stripeMode
  )
    return createResultError(failureOp, message)
  return createResult(null)
}

export async function organizerDashboardBillingInvoiceStatusGet(
  config: OrganizerDashboardBillingConfig,
  scope: InvoiceScope,
  fetcher: OrganizerDashboardBillingFetch = globalThis.fetch,
): Promise<Result<OrganizerDashboardBillingInvoiceStatusResponse["data"]>> {
  const callOp = "organizerDashboardBillingInvoiceStatusGet"
  const path = `/api/checkout/organizations/eventoren/ticket-checkout/${encodeURIComponent(scope.paymentReference)}/invoice/status?${invoiceQuery(config, scope)}`
  const response = await billingFetchJson<OrganizerDashboardBillingInvoiceStatusResponse>(
    fetcher,
    `${config.baseUrl}${path}`,
    { method: "GET", headers: billingHeaders(config) },
    invoiceStatusResponseSchema,
    callOp,
    "Billing invoice status returned HTTP",
  )
  if (!response.success) return response
  const echo = scopeEchoCheck(
    callOp,
    scope,
    response.data.data,
    "The Billing API invoice status did not match the request",
  )
  if (!echo.success) return echo
  return createResult(response.data.data)
}

export async function organizerDashboardBillingInvoicePdfGet(
  config: OrganizerDashboardBillingConfig,
  scope: InvoiceScope,
  fetcher: OrganizerDashboardBillingFetch = globalThis.fetch,
): Promise<Result<Uint8Array>> {
  const callOp = "organizerDashboardBillingInvoicePdfGet"
  const path = `/api/checkout/organizations/eventoren/ticket-checkout/${encodeURIComponent(scope.paymentReference)}/invoice/pdf?${invoiceQuery(config, scope)}`
  let response: Response
  try {
    response = await fetcher(`${config.baseUrl}${path}`, {
      method: "GET",
      headers: billingHeaders(config),
      signal: AbortSignal.timeout(timeoutMilliseconds),
    })
  } catch {
    return createResultError(callOp, "Billing request failed")
  }
  if (!response.ok) {
    if (response.status === 404) return createResultError(callOp, "No invoice is available for this order")
    if (response.status === 409) return createResultError(callOp, "No invoice PDF is available for this order")
    return createResultError(callOp, `Billing invoice PDF returned HTTP ${response.status}`)
  }
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/pdf")) return createResultError(callOp, "Billing returned an invalid response")
  try {
    return createResult(new Uint8Array(await response.arrayBuffer()))
  } catch {
    return createResultError(callOp, "Billing returned an invalid response")
  }
}

export async function organizerDashboardBillingInvoiceResend(
  config: OrganizerDashboardBillingConfig,
  input: ResendInput,
  fetcher: OrganizerDashboardBillingFetch = globalThis.fetch,
): Promise<Result<OrganizerDashboardBillingInvoiceResendResponse["data"]>> {
  const callOp = "organizerDashboardBillingInvoiceResend"
  const body = { ...input, organizationId: config.organizationId }
  const parsed = v.safeParse(organizerDashboardBillingInvoiceResendRequestSchema, body)
  if (!parsed.success) return createResultError(callOp, "The invoice resend request was invalid")
  const path = `/api/checkout/organizations/eventoren/ticket-checkout/${encodeURIComponent(input.paymentReference)}/invoice/resend?${new URLSearchParams({ organizationId: config.organizationId }).toString()}`
  const response = await billingFetchJson<OrganizerDashboardBillingInvoiceResendResponse>(
    fetcher,
    `${config.baseUrl}${path}`,
    {
      method: "POST",
      headers: { ...billingHeaders(config), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    invoiceResendResponseSchema,
    callOp,
    "Billing invoice resend returned HTTP",
  )
  if (!response.success) return response
  const echo = scopeEchoCheck(
    callOp,
    input,
    response.data.data,
    "The Billing API invoice resend did not match the request",
  )
  if (!echo.success) return echo
  return createResult(response.data.data)
}

export async function organizerDashboardBillingRefundRequest(
  config: OrganizerDashboardBillingConfig,
  input: RefundInput,
  fetcher: OrganizerDashboardBillingFetch = globalThis.fetch,
): Promise<Result<OrganizerDashboardBillingRefundStatus["data"]>> {
  const callOp = "organizerDashboardBillingRefundRequest"
  const body = { ...input, organizationId: config.organizationId }
  const parsed = v.safeParse(organizerDashboardBillingRefundRequestSchema, body)
  if (!parsed.success) return createResultError(callOp, "The Eventoren refund request was invalid")
  const path = `/api/checkout/organizations/eventoren/ticket-checkout/${encodeURIComponent(input.paymentReference)}/refunds?${new URLSearchParams({ organizationId: config.organizationId }).toString()}`
  const response = await billingFetchJson<OrganizerDashboardBillingRefundStatus>(
    fetcher,
    `${config.baseUrl}${path}`,
    {
      method: "POST",
      headers: { ...billingHeaders(config), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    organizerDashboardBillingRefundStatusSchema,
    callOp,
    "Billing refund request returned HTTP",
  )
  if (!response.success) return response
  if (
    response.data.data.paymentReference !== input.paymentReference ||
    response.data.data.orderReference !== input.orderReference ||
    response.data.data.stripeMode !== input.stripeMode ||
    response.data.data.refundReference !== input.refundReference ||
    response.data.data.amountCents !== input.amountCents
  )
    return createResultError(callOp, "The Billing API refund response did not match the request")
  return createResult(response.data.data)
}

export async function organizerDashboardBillingRefundStatusGet(
  config: OrganizerDashboardBillingConfig,
  input: {
    readonly paymentReference: string
    readonly orderReference: string
    readonly stripeMode: "live" | "test"
    readonly refundReference: string
  },
  fetcher: OrganizerDashboardBillingFetch = globalThis.fetch,
): Promise<Result<OrganizerDashboardBillingRefundStatus["data"]>> {
  const callOp = "organizerDashboardBillingRefundStatusGet"
  const query = new URLSearchParams({
    orderReference: input.orderReference,
    stripeMode: input.stripeMode,
    organizationId: config.organizationId,
  })
  const path = `/api/checkout/organizations/eventoren/ticket-checkout/${encodeURIComponent(input.paymentReference)}/refunds/${encodeURIComponent(input.refundReference)}/status?${query.toString()}`
  const response = await billingFetchJson<OrganizerDashboardBillingRefundStatus>(
    fetcher,
    `${config.baseUrl}${path}`,
    { method: "GET", headers: billingHeaders(config) },
    organizerDashboardBillingRefundStatusSchema,
    callOp,
    "Billing refund status returned HTTP",
  )
  if (!response.success) return response
  if (
    response.data.data.paymentReference !== input.paymentReference ||
    response.data.data.orderReference !== input.orderReference ||
    response.data.data.stripeMode !== input.stripeMode ||
    response.data.data.refundReference !== input.refundReference
  )
    return createResultError(callOp, "The Billing API refund status did not match the request")
  return createResult(response.data.data)
}
