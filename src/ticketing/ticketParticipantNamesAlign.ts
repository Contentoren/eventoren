import type { TicketParticipantNames } from "./TicketParticipantNames.ts"

export function ticketParticipantNamesAlign(
  names: TicketParticipantNames,
  items: readonly {
    readonly event: { readonly id: string }
    readonly cart: { readonly lines: readonly { readonly tierId: string; readonly quantity: number }[] }
  }[],
): TicketParticipantNames {
  const aligned: Record<string, Record<string, readonly string[]>> = {}

  for (const item of items) {
    const eventNames: Record<string, readonly string[]> = {}
    for (const line of item.cart.lines) {
      if (line.quantity <= 0) continue
      const current = names[item.event.id]?.[line.tierId] ?? []
      eventNames[line.tierId] = Array.from({ length: line.quantity }, (_, index) => current[index] ?? "")
    }
    aligned[item.event.id] = eventNames
  }

  return aligned
}
