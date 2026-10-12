import type { EventTicketTier } from "./EventTicketTier.ts"

export function eventTicketTierMaxPerOrderGet(tier: Pick<EventTicketTier, "maxPerOrder">): number {
  const maxPerOrder = tier.maxPerOrder
  if (maxPerOrder === undefined || !Number.isSafeInteger(maxPerOrder) || maxPerOrder < 1) return 10
  return maxPerOrder
}
