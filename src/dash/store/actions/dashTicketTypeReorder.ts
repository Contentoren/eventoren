import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export function dashTicketTypeReorder(
  eventId: string,
  orderedIds: string[],
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashTicketTypeReorder"
  const event = store.state.events.find((candidate) => candidate.id === eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const types = store.state.ticketTypes.filter((candidate) => candidate.eventId === eventId)
  const known = new Set(types.map((candidate) => candidate.id))
  if (orderedIds.length !== types.length || !orderedIds.every((id) => known.has(id)))
    return createResultError(op, "Die Reihenfolge passt nicht zu den Ticketarten des Events.")
  const byId = new Map(types.map((candidate) => [candidate.id, candidate]))
  const before = [...types].sort((a, b) => a.sortOrder - b.sortOrder).map((candidate) => candidate.name)
  const after = orderedIds.map((id) => byId.get(id)?.name ?? id)
  return store.update(op, (draft) => {
    for (const [index, id] of orderedIds.entries()) {
      const target = draft.ticketTypes.find((candidate) => candidate.id === id)
      if (!target) throw new Error("Ticketart nicht gefunden.")
      target.sortOrder = index
    }
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "tickets",
      action: "Reihenfolge der Ticketarten geändert",
      before: before.join(", "),
      after: after.join(", "),
    })
  })
}
