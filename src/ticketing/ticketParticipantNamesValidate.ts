import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketParticipantNames } from "./TicketParticipantNames.ts"
import { ticketParticipantNamesAlign } from "./ticketParticipantNamesAlign.ts"

export function ticketParticipantNamesValidate(
  names: TicketParticipantNames,
  items: readonly {
    readonly event: { readonly id: string }
    readonly cart: { readonly lines: readonly { readonly tierId: string; readonly quantity: number }[] }
  }[],
  requiredMessage: string,
): Result<TicketParticipantNames> {
  const op = "ticketParticipantNamesValidate"
  const aligned = ticketParticipantNamesAlign(names, items)
  const trimmed: Record<string, Record<string, readonly string[]>> = {}

  for (const item of items) {
    const eventNames: Record<string, readonly string[]> = {}
    for (const line of item.cart.lines) {
      if (line.quantity <= 0) continue
      const lineNames = aligned[item.event.id]?.[line.tierId]?.map((name) => name.trim()) ?? []
      if (lineNames.length !== line.quantity || lineNames.some((name) => name.length === 0)) {
        return createResultError(op, requiredMessage, names)
      }
      eventNames[line.tierId] = lineNames
    }
    trimmed[item.event.id] = eventNames
  }

  return createResult(trimmed)
}
