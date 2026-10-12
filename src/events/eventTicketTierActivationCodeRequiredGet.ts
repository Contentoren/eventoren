import type { EventTicketTier } from "./EventTicketTier.ts"

export function eventTicketTierActivationCodeRequiredGet(
  tier: Pick<EventTicketTier, "activationCodeRequired">,
): boolean {
  return tier.activationCodeRequired === true
}
