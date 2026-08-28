import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { ticketPaymentMethodDefault } from "./ticketPaymentMethodDefault.ts"
import { ticketPaymentMethodDraftKey } from "./ticketPaymentMethodDraftKey.ts"
import { ticketPaymentMethodParse } from "./ticketPaymentMethodParse.ts"

const op = "ticketPaymentMethodDraftLoad"

export function ticketPaymentMethodDraftLoad(): Result<TicketPaymentMethod> {
  if (typeof localStorage === "undefined") return createResult(ticketPaymentMethodDefault)

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketPaymentMethodDraftKey)
  } catch (error) {
    return createResultError(op, "Zahlungsart konnte nicht gelesen werden.", error)
  }
  if (raw === null) return createResult(ticketPaymentMethodDefault)

  return ticketPaymentMethodParse(raw)
}
