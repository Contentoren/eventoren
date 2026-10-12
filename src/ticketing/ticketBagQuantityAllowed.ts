import type { EventItem } from "../events/EventItem.ts"

/**
 * Cart-route guard: protected products can only change quantity on the event
 * page where the code field lives. Increases there require a validated code;
 * the bag keeps its existing event link as the route back.
 */
export function ticketBagQuantityAllowed(
  event: EventItem | undefined,
  tierId: string,
  currentQuantity: number,
  nextQuantity: number,
): boolean {
  if (nextQuantity <= currentQuantity) return true
  const tier = event?.tiers.find((candidate) => candidate.id === tierId)
  if (!tier || tier.activationCodeRequired !== true) return true
  return false
}
