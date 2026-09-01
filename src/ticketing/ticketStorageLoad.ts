import { createResult } from "../ui/createResult.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketOrderMockList } from "./ticketOrderMockList.ts"
import { ticketOrderParse } from "./ticketOrderParse.ts"
import { ticketStorageKey } from "./ticketStorageKey.ts"

export function ticketStorageLoad(): Result<readonly TicketOrder[]> {
  if (typeof localStorage === "undefined") return createResult(ticketOrderMockList)

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketStorageKey)
  } catch {
    return createResult(ticketOrderMockList)
  }
  if (raw === null) return createResult(ticketOrderMockList)

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return createResult(ticketOrderMockList)
  }
  if (!Array.isArray(parsed)) return createResult(ticketOrderMockList)

  const orders: TicketOrder[] = []
  for (const entry of parsed) {
    const order = ticketOrderParse(entry)
    if (order.success) orders.push(order.data)
  }

  if (orders.length === 0) return createResult(ticketOrderMockList)

  return createResult(orders)
}
