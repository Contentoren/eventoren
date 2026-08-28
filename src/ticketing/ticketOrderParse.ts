import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import { ticketPaymentMethodDefault } from "./ticketPaymentMethodDefault.ts"
import { ticketPaymentMethodParse } from "./ticketPaymentMethodParse.ts"

const op = "ticketOrderParse"

export function ticketOrderParse(input: unknown): Result<TicketOrder> {
  if (typeof input !== "object" || input === null) return createResultError(op, "Bestellung ist kein Objekt.", input)

  const candidate = input as Partial<TicketOrder>
  if (typeof candidate.id !== "string" || candidate.id.length === 0)
    return createResultError(op, "Bestellung benötigt eine id.", input)
  if (typeof candidate.code !== "string" || candidate.code.length === 0)
    return createResultError(op, "Bestellung benötigt einen Code.", input)
  if (typeof candidate.eventId !== "string" || candidate.eventId.length === 0)
    return createResultError(op, "Bestellung benötigt eine eventId.", input)
  if (typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt)))
    return createResultError(op, "Bestellung benötigt ein gültiges Datum.", input)
  if (!Array.isArray(candidate.lines) || candidate.lines.length === 0)
    return createResultError(op, "Bestellung benötigt mindestens eine Position.", input)
  if (typeof candidate.total !== "object" || candidate.total === null)
    return createResultError(op, "Bestellung benötigt eine Summe.", input)
  if (typeof candidate.contact !== "object" || candidate.contact === null)
    return createResultError(op, "Bestellung benötigt Kontaktdaten.", input)

  const paymentMethod = ticketPaymentMethodParse(candidate.paymentMethod)

  return createResult({
    ...(candidate as TicketOrder),
    paymentMethod: paymentMethod.success ? paymentMethod.data : ticketPaymentMethodDefault,
  })
}
