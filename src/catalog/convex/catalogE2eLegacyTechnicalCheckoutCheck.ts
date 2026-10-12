import { createResult, createResultError, type Result } from "#result"

export const catalogE2eLegacyTechnicalCheckoutEventKey = "technischer-checkout-test-keine-veranstaltung-e879ab05"

const fictitiousPattern = /fiktiv|fictitious|keine veranstaltung|kein echt|test|technisch/i

/**
 * Prove ownership of the explicitly fictitious production technical-checkout
 * fixture. The event key must match exactly and the stored description must state
 * the fictitious test purpose. Tier labels are intentionally not required to
 * carry fictitious wording: an ordinary price-category label is fine once the
 * exact event key plus fictitious description confirm the fixture, because every
 * tier and order line is additionally proven linked to that exact event by the
 * structural graph proof (tiers scoped by eventId, order lines referencing those
 * tierIds). Without explicit fictitious corroboration the row is retained for
 * manual reconciliation; a generic test title alone never establishes ownership.
 */
export function catalogE2eLegacyTechnicalCheckoutCheck(input: { eventKey: string; description: string }): Result<true> {
  const op = "catalogE2eLegacyTechnicalCheckoutCheck"
  if (input.eventKey !== catalogE2eLegacyTechnicalCheckoutEventKey)
    return createResultError(op, "Event key is not the approved technical-checkout fixture")
  if (!fictitiousPattern.test(input.description))
    return createResultError(
      op,
      "Technical-checkout fixture lacks explicitly fictitious description; retain for manual reconciliation",
    )
  return createResult(true)
}
