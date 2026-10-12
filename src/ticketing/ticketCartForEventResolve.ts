import type { EventItem } from "../events/EventItem.ts"
import { eventTicketTierMaxPerOrderGet } from "../events/eventTicketTierMaxPerOrderGet.ts"
import type { TicketCart } from "./TicketCart.ts"

export function ticketCartForEventResolve(event: EventItem, cart: TicketCart): TicketCart | undefined {
  const quantitiesByTier = new Map<string, number>()
  for (const line of cart.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) continue
    quantitiesByTier.set(line.tierId, (quantitiesByTier.get(line.tierId) ?? 0) + line.quantity)
  }
  const lines = [...quantitiesByTier.entries()].flatMap(([tierId, quantity]) => {
    const tier = event.tiers.find((candidate) => candidate.id === tierId)
    if (!tier) return []
    const clamped = Math.max(0, Math.min(quantity, tier.available, eventTicketTierMaxPerOrderGet(tier)))
    return clamped > 0 ? [{ tierId, quantity: clamped }] : []
  })
  if (lines.length === 0) return undefined

  return { eventId: event.id, lines }
}
