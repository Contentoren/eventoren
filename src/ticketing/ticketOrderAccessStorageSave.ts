import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrderAccessRecord } from "./TicketOrderAccessRecord.ts"
import { ticketOrderAccessStorageKey } from "./ticketOrderAccessStorageKey.ts"

const op = "ticketOrderAccessStorageSave"

export function ticketOrderAccessStorageSave(records: readonly TicketOrderAccessRecord[]): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)
  try {
    localStorage.setItem(ticketOrderAccessStorageKey, JSON.stringify(records))
  } catch (error) {
    return createResultError(op, "Bestellung konnte im Browser nicht gespeichert werden.", error)
  }
  return createResult(null)
}
