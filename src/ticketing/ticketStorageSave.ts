import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketStorageKey } from "./ticketStorageKey.ts"

const op = "ticketStorageSave"

export function ticketStorageSave(orders: readonly TicketOrder[]): Result<readonly TicketOrder[]> {
  if (typeof localStorage === "undefined") return createResult(orders)

  try {
    localStorage.setItem(ticketStorageKey, JSON.stringify(orders))
  } catch (error) {
    return createResultError(op, "Tickets konnten nicht gespeichert werden.", error)
  }
  return createResult(orders)
}
