import { eventorenTicketCheckoutCancellationSchema } from "billing/contracts/eventorenTicketCheckoutCancellationSchema"
import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import { httpAction } from "#convex/_generated/server.js"
import {
  type TicketPaymentOutcomeErrorCode,
  ticketPaymentOutcomeErrorCatalog,
  ticketPaymentOutcomeUnknownError,
} from "../ticketPaymentOutcomeErrorCatalog.ts"

export const ticketPaymentOutcomeHttpAction = httpAction(async (ctx, request) => {
  const op = "ticketPaymentOutcomeHttpAction"
  const requestId = crypto.randomUUID()
  const fail = (code: TicketPaymentOutcomeErrorCode | string, message: string) => {
    const entry = (ticketPaymentOutcomeErrorCatalog as Record<string, { httpStatus: number; retryable: boolean }>)[
      code
    ] ?? {
      httpStatus: ticketPaymentOutcomeUnknownError.httpStatus,
      retryable: ticketPaymentOutcomeUnknownError.retryable,
    }
    const status = entry.httpStatus
    const resolvedCode = code in ticketPaymentOutcomeErrorCatalog ? code : ticketPaymentOutcomeUnknownError.code
    console.info("Payment outcome receiver rejected request", { status, code: resolvedCode, requestId })
    return Response.json(
      { error: { code: resolvedCode, message, op, status, requestId, retryable: entry.retryable, details: {} } },
      { status },
    )
  }
  const token = process.env.EVENTOREN_PAYMENT_OUTCOME_BEARER_TOKEN
  const organizationId = process.env.EVENTOREN_BILLING_ORGANIZATION_ID
  const mode = process.env.EVENTOREN_BILLING_STRIPE_MODE
  if (!token || !organizationId || (mode !== "test" && mode !== "live"))
    return fail("ticketing.outcome-unconfigured", "The payment outcome receiver is not configured")
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return fail("ticketing.outcome-unauthorized", "Unauthorized")
  // Native HMAC verification performs constant-time MAC comparison. No outbound API
  // credential is read, and neither credentials nor raw request bodies are logged.
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(token), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(token))
  if (!(await crypto.subtle.verify("HMAC", key, signature, encoder.encode(authorization.slice(7)))))
    return fail("ticketing.outcome-unauthorized", "Unauthorized")
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("ticketing.outcome-invalid", "The cancellation body is invalid")
  }
  const parsed = a.safeParse(eventorenTicketCheckoutCancellationSchema, body)
  if (!parsed.success) return fail("ticketing.outcome-invalid", "The cancellation body is invalid")
  const identities = body as { organizationId: string; eventKey: string; orderReference: string }
  if (
    identities.organizationId !== organizationId ||
    parsed.output.stripeMode !== mode ||
    identities.eventKey !== parsed.output.eventKey ||
    identities.orderReference !== parsed.output.orderReference
  )
    return fail("ticketing.outcome-conflict", "The cancellation identity does not match exactly")
  const result = await ctx.runMutation(internal.ticketing.ticketPaymentCancellationMutation, {
    cancellation: parsed.output,
  })
  if (!result.success)
    return fail("ticketing.outcome-conflict", "The cancellation evidence does not match persisted checkout evidence")
  console.info("Payment outcome receiver accepted cancellation", {
    orderId: result.data.orderId,
    replayed: result.data.replayed,
  })
  return Response.json(result)
})
