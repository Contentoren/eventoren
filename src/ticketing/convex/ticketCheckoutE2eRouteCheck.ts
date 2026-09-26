import { createResult, createResultError, type Result } from "#result"

// Reserved for the ticket workflow. Until a separate, authenticated E2E Billing
// tenant and its complete payment lifecycle exist, never send these keys to
// the production Billing organization (even if its global mode is changed).
export function ticketCheckoutE2eRouteCheck(
  eventKey: string,
  publicBaseUrl: string,
  stripeMode: "live" | "test",
): Result<true> {
  const op = "ticketCheckoutE2eRouteCheck"
  if (!eventKey.startsWith("ticket-e2e-")) return createResult(true)
  let origin: string
  try {
    origin = new URL(publicBaseUrl).origin
  } catch (error) {
    return createResultError(op, "The checkout origin is invalid", String(error))
  }
  if (origin === "https://eventoren.de" || stripeMode !== "test")
    return createResultError(op, "E2E ticket checkout requires a dedicated test-mode Billing tenant")
  return createResult(true)
}
