import type { EventTicketTier } from "./EventTicketTier.ts"

export function eventTicketTierPriceTotal(tier: EventTicketTier): number {
  return tier.priceCents + tier.feeCents
}
