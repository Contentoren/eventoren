import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashTicket } from "./dashTicketSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

const validOrderStatus = new Set<DashOrder["status"]>(["bezahlt", "offen", "teilerstattet"])

export function dashTicketTypeSales(args: { ticketType: DashTicketType; orders: DashOrder[]; tickets: DashTicket[] }): {
  sold: number
  soldByPhase: Record<string, number>
  available: number
  capacity: number
  revenueCents: number
} {
  const { ticketType, orders, tickets } = args
  const relevant: DashOrder[] = []
  const relevantIds = new Set<string>()
  for (const order of orders) {
    if (order.eventId !== ticketType.eventId) continue
    if (!validOrderStatus.has(order.status)) continue
    let hasLine = false
    for (const line of order.lines) {
      if (line.ticketTypeId === ticketType.id) {
        hasLine = true
        break
      }
    }
    if (!hasLine) continue
    relevant.push(order)
    relevantIds.add(order.id)
  }
  const ticketsByOrder = new Map<string, DashTicket[]>()
  for (const ticket of tickets) {
    if (ticket.eventId !== ticketType.eventId) continue
    if (ticket.ticketTypeId !== ticketType.id) continue
    if (ticket.status !== "gueltig") continue
    if (!relevantIds.has(ticket.orderId)) continue
    const list = ticketsByOrder.get(ticket.orderId)
    if (list === undefined) ticketsByOrder.set(ticket.orderId, [ticket])
    else list.push(ticket)
  }
  const soldByPhase: Record<string, number> = {}
  let sold = 0
  let revenueCents = 0
  for (const order of relevant) {
    const valid = ticketsByOrder.get(order.id) ?? []
    if (valid.length === 0) continue
    const lines = order.lines.filter((line) => line.ticketTypeId === ticketType.id)
    let remaining = valid.length
    for (const line of lines) {
      if (remaining === 0) break
      const isLast = line === lines[lines.length - 1]
      const count = isLast ? remaining : Math.min(line.quantity, remaining)
      soldByPhase[line.phaseId] = (soldByPhase[line.phaseId] ?? 0) + count
      sold += count
      revenueCents += count * line.unitPriceCents
      remaining -= count
    }
  }
  return {
    sold,
    soldByPhase,
    available: Math.max(0, ticketType.capacity - sold),
    capacity: ticketType.capacity,
    revenueCents,
  }
}
