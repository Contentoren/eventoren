import type { EventItem } from "../events/EventItem.ts"
import { eventTicketTierMaxPerOrderGet } from "../events/eventTicketTierMaxPerOrderGet.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

export function ticketCartForEventResolve(event: EventItem, cart: TicketCart): TicketCart | undefined {
  const quantitiesByTier = new Map<string, number>()
  const codesByTier = new Map<string, string>()
  for (const line of cart.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) continue
    quantitiesByTier.set(line.tierId, (quantitiesByTier.get(line.tierId) ?? 0) + line.quantity)
    if (!codesByTier.has(line.tierId) && line.activationCode) {
      const normalized = ticketActivationCodeNormalize(line.activationCode)
      if (normalized.length > 0) codesByTier.set(line.tierId, normalized)
    }
  }
  const lines = [...quantitiesByTier.entries()].flatMap(([tierId, quantity]) => {
    const tier = event.tiers.find((candidate) => candidate.id === tierId)
    if (!tier) return []
    const clamped = Math.max(0, Math.min(quantity, tier.available, eventTicketTierMaxPerOrderGet(tier)))
    if (clamped <= 0) return []
    const code = codesByTier.get(tierId)
    return code ? [{ tierId, quantity: clamped, activationCode: code }] : [{ tierId, quantity: clamped }]
  })
  if (lines.length === 0) return undefined

  return { eventId: event.id, lines }
}
