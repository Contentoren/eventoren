import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { ticketPaymentMethodDraftKey } from "./ticketPaymentMethodDraftKey.ts"

const op = "ticketPaymentMethodDraftSave"

export function ticketPaymentMethodDraftSave(method: TicketPaymentMethod | null): Result<null> {
  if (typeof localStorage === "undefined") return createResult(null)

  try {
    if (method === null) localStorage.removeItem(ticketPaymentMethodDraftKey)
    else localStorage.setItem(ticketPaymentMethodDraftKey, method)
  } catch (error) {
    return createResultError(op, "Zahlungsart konnte nicht gespeichert werden.", error)
  }
  return createResult(null)
}
