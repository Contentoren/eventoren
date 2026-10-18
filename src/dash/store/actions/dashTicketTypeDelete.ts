import { createResult, createResultError, type Result } from "#result"

import { dashTicketTypeSales } from "../../model/dashTicketTypeSales.ts"
import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export function dashTicketTypeDelete(
  id: string,
  store: DashStore = dashStoreGet(),
): Result<"geloescht" | "archiviert"> {
  const op = "dashTicketTypeDelete"
  const ticketType = store.state.ticketTypes.find((candidate) => candidate.id === id)
  if (!ticketType) return createResultError(op, "Ticketart nicht gefunden.")
  const sales = dashTicketTypeSales({ ticketType, orders: store.state.orders, tickets: store.state.tickets })
  const nowIso = new Date().toISOString()
  if (sales.sold === 0) {
    const deleted = store.update(op, (draft) => {
      const index = draft.ticketTypes.findIndex((candidate) => candidate.id === id)
      if (index < 0) throw new Error("Ticketart nicht gefunden.")
      const event = draft.events.find((candidate) => candidate.id === ticketType.eventId)
      if (!event) throw new Error("Event nicht gefunden.")
      draft.ticketTypes.splice(index, 1)
      dashAuditAdd(draft, {
        orgId: event.orgId,
        eventId: event.id,
        area: "tickets",
        action: `Ticketart „${ticketType.name}“ gelöscht`,
        before: `Kontingent ${ticketType.capacity}`,
        after: null,
      })
    })
    if (!deleted.success) return createResultError(op, "Die Ticketart konnte nicht gelöscht werden.")
    return createResult("geloescht")
  }
  const archived = store.update(op, (draft) => {
    const target = draft.ticketTypes.find((candidate) => candidate.id === id)
    if (!target) throw new Error("Ticketart nicht gefunden.")
    const event = draft.events.find((candidate) => candidate.id === ticketType.eventId)
    if (!event) throw new Error("Event nicht gefunden.")
    target.archivedAt = nowIso
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "tickets",
      action: `Ticketart „${ticketType.name}“ archiviert`,
      before: `Kontingent ${ticketType.capacity}`,
      after: `${sales.sold} verkauft · archiviert`,
    })
  })
  if (!archived.success) return createResultError(op, "Die Ticketart konnte nicht archiviert werden.")
  return createResult("archiviert")
}
