import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartLine } from "./TicketCartLine.ts"

export function ticketCartSearchParse(eventId: string, value: string): TicketCart {
  if (value.length === 0) return { eventId, lines: [] }

  const lines: TicketCartLine[] = []
  for (const entry of value.split(",")) {
    const [tierId, rawQuantity, extra] = entry.split(":")
    if (!tierId || !rawQuantity || extra !== undefined || !/^\d+$/.test(rawQuantity)) continue

    const quantity = Number(rawQuantity)
    if (!Number.isSafeInteger(quantity) || quantity < 1) continue

    lines.push({ tierId, quantity })
  }

  return { eventId, lines }
}
