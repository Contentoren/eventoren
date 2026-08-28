import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { ticketPaymentMethodOptions } from "./ticketPaymentMethodOptions.ts"

const op = "ticketPaymentMethodParse"

export function ticketPaymentMethodParse(input: unknown): Result<TicketPaymentMethod> {
  if (typeof input !== "string") return createResultError(op, "Zahlungsart ist kein Text.", input)

  const match = ticketPaymentMethodOptions.find((option) => option.id === input)
  if (!match) return createResultError(op, "Unbekannte Zahlungsart.", input)

  return createResult(match.id)
}
