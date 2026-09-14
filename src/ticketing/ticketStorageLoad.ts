import { createResult } from "../ui/createResult.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketOrderParse } from "./ticketOrderParse.ts"
import { ticketStorageKey } from "./ticketStorageKey.ts"

export function ticketStorageLoad(): Result<readonly TicketOrder[]> {
  if (typeof localStorage === "undefined") return createResult([])

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketStorageKey)
  } catch {
    return createResult([])
  }
  if (raw === null) return createResult([])

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return createResult([])
  }
  if (!Array.isArray(parsed)) return createResult([])

  const orders: TicketOrder[] = []
  for (const entry of parsed) {
    const order = ticketOrderParse(entry)
    if (order.success) orders.push(order.data)
  }

  return createResult(orders)
}
