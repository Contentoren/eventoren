import type { EventItem } from "./EventItem.ts"

export function eventPriceFrom(event: EventItem): number {
  return Math.min(...event.tiers.map((tier) => tier.priceCents))
}
