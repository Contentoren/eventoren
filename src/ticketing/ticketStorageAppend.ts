import type { Result } from "../ui/Result.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketStorageLoad } from "./ticketStorageLoad.ts"
import { ticketStorageSave } from "./ticketStorageSave.ts"

export function ticketStorageAppend(order: TicketOrder): Result<readonly TicketOrder[]> {
  const existing = ticketStorageLoad()
  if (!existing.success) return existing

  const next = [order, ...existing.data.filter((entry) => entry.id !== order.id)]
  return ticketStorageSave(next)
}
