import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartLine } from "./TicketCartLine.ts"
import { ticketMaxPerOrder } from "./ticketMaxPerOrder.ts"

export function ticketCartSearchParse(eventId: string, value: string): TicketCart {
  if (value.length === 0) return { eventId, lines: [] }

  const lines: TicketCartLine[] = []
  for (const entry of value.split(",")) {
    const [tierId, rawQuantity] = entry.split(":")
    if (!tierId || !rawQuantity) continue

    const quantity = Number.parseInt(rawQuantity, 10)
    if (!Number.isFinite(quantity) || quantity <= 0) continue

    lines.push({ tierId, quantity: Math.min(quantity, ticketMaxPerOrder) })
  }

  return { eventId, lines }
}
