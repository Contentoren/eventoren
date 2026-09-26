import { createResult, createResultError } from "#result"

/** Production currently routes Eventoren checkout to live Stripe. Never start a paid fixture there. */
export const e2eTicketTargetCheck = (target: "production" | "development") => {
  const op = "e2eTicketTargetCheck"
  if (target === "production") {
    return createResultError(
      op,
      "Ticket E2E cannot run on production: EVENTOREN_BILLING_STRIPE_MODE is live. A verified production test-mode checkout and owned-resource cleanup are required before enabling it; refusing to create an event or enter payment details.",
    )
  }
  return createResult(true)
}
