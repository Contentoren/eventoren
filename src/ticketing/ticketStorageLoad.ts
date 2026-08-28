import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketOrderParse } from "./ticketOrderParse.ts"
import { ticketStorageKey } from "./ticketStorageKey.ts"

const op = "ticketStorageLoad"

export function ticketStorageLoad(): Result<readonly TicketOrder[]> {
  if (typeof localStorage === "undefined") return createResult([])

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketStorageKey)
  } catch (error) {
    return createResultError(op, "Tickets konnten nicht gelesen werden.", error)
  }
  if (raw === null) return createResult([])

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return createResultError(op, "Gespeicherte Tickets sind beschädigt.", error)
  }
  if (!Array.isArray(parsed)) return createResultError(op, "Gespeicherte Tickets sind keine Liste.", parsed)

  const orders: TicketOrder[] = []
  for (const entry of parsed) {
    const order = ticketOrderParse(entry)
    if (order.success) orders.push(order.data)
  }
  return createResult(orders)
}
