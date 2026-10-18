import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Löscht einen Gast und storniert seine Gästeliste-Tickets. */
export function dashGuestDelete(guestId: string, store: DashStore = dashStoreGet()): Result<"geloescht"> {
  const op = "dashGuestDelete"
  const guest = store.state.guests.find((candidate) => candidate.id === guestId)
  if (!guest) return createResultError(op, "Gast nicht gefunden.")
  const updated = store.update(op, (draft) => {
    const index = draft.guests.findIndex((candidate) => candidate.id === guestId)
    if (index < 0) throw new Error("Gast nicht gefunden.")
    const order = guest.ticketId
      ? draft.orders.find((candidate) =>
          draft.tickets.some((ticket) => ticket.id === guest.ticketId && ticket.orderId === candidate.id),
        )
      : undefined
    if (order) {
      order.status = "storniert"
      for (const ticket of draft.tickets) if (ticket.orderId === order.id) ticket.status = "storniert"
    }
    const event = draft.events.find((candidate) => candidate.id === guest.eventId)
    if (!event) throw new Error("Event nicht gefunden.")
    draft.guests.splice(index, 1)
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "gaesteliste",
      action: `Gast „${guest.name}“ entfernt`,
      before: guest.name,
      after: null,
    })
  })
  if (!updated.success) return createResultError(op, "Der Gast konnte nicht gelöscht werden.")
  return createResult("geloescht")
}
