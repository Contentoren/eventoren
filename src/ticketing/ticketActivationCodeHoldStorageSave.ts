import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import { ticketActivationCodeHoldKey } from "./ticketActivationCodeHoldKey.ts"
import type { TicketActivationCodeHoldStored } from "./ticketActivationCodeHoldStoredSchema.ts"

const op = "ticketActivationCodeHoldStorageSave"

export function ticketActivationCodeHoldStorageSave(records: readonly TicketActivationCodeHoldStored[]): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)
  try {
    if (records.length === 0) {
      localStorage.removeItem(ticketActivationCodeHoldKey)
    } else {
      localStorage.setItem(ticketActivationCodeHoldKey, JSON.stringify(records))
    }
  } catch (error) {
    return createResultError(op, "Freischaltungscode konnte im Browser nicht gespeichert werden.", error)
  }
  return createResult(null)
}
