import { ticketCheckoutCancelUrlCreate } from "./ticketCheckoutCancelUrlCreate.ts"

/**
 * Stable pre-key URL context for the retry lookup probe. The stored snapshot
 * carries generated return URLs containing the first checkout key, while the
 * probe runs before any key exists; the lookup strips only the generated
 * `checkout` query, so origin and path must already match. Cancel URLs carry
 * no key and are reused verbatim. An invalid origin yields empty probes that
 * never match, so the submit falls through to the fresh-key error path.
 */
export function ticketCheckoutRetryProbeUrlsRead(
  appOrigin: string,
  eventKey: string,
): { readonly successUrl: string; readonly cancelUrl: string } {
  try {
    const origin = new URL(appOrigin).origin
    const cancelUrl = ticketCheckoutCancelUrlCreate(appOrigin, eventKey)
    return {
      successUrl: new URL("/checkout", origin).toString(),
      cancelUrl: cancelUrl.success ? cancelUrl.data : "",
    }
  } catch {
    return { successUrl: "", cancelUrl: "" }
  }
}
