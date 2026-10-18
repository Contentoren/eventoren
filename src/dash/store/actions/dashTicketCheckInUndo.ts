import { createResultError, type Result } from "#result"

import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export function dashTicketCheckInUndo(ticketId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashTicketCheckInUndo"
  const ticket = store.state.tickets.find((candidate) => candidate.id === ticketId)
  if (!ticket) return createResultError(op, "Ticket nicht gefunden.")
  if (ticket.checkedInAt === null) return createResultError(op, "Das Ticket ist nicht eingecheckt.")
  return store.update(op, (draft) => {
    const target = draft.tickets.find((candidate) => candidate.id === ticketId)
    if (!target) throw new Error("Ticket nicht gefunden.")
    target.checkedInAt = null
    target.entrance = null
    const event = draft.events.find((candidate) => candidate.id === target.eventId)
    if (event)
      dashAuditAdd(draft, {
        orgId: event.orgId,
        eventId: event.id,
        area: "einlass",
        action: `Check-in von Ticket ${target.code} zurückgenommen`,
        before: ticket.entrance ?? "Eingecheckt",
        after: "Offen",
      })
  })
}
