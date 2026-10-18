import { createResult, createResultError, type Result } from "#result"

import type { DashEntrance } from "../../model/dashEntranceSchema.ts"
import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashIdCreate } from "../dashIdCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export function dashTicketCheckIn(
  ticketId: string,
  entrance: DashEntrance,
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashTicketCheckIn"
  const ticket = store.state.tickets.find((candidate) => candidate.id === ticketId)
  if (!ticket) return createResultError(op, "Ticket nicht gefunden.")
  if (ticket.status !== "gueltig") return createResultError(op, "Das Ticket ist storniert.")
  if (ticket.checkedInAt !== null) return createResultError(op, "Das Ticket ist bereits eingecheckt.")
  const nowIso = new Date().toISOString()
  return store.update(op, (draft) => {
    const target = draft.tickets.find((candidate) => candidate.id === ticketId)
    if (!target) throw new Error("Ticket nicht gefunden.")
    target.checkedInAt = nowIso
    target.entrance = entrance
    draft.scans.push({
      id: dashIdCreate("scan"),
      eventId: target.eventId,
      at: nowIso,
      entrance,
      device: "Manuell",
      ticketId: target.id,
      code: target.code,
      result: "ok",
    })
    const event = draft.events.find((candidate) => candidate.id === target.eventId)
    if (event)
      dashAuditAdd(draft, {
        orgId: event.orgId,
        eventId: event.id,
        area: "einlass",
        action: `Ticket ${target.code} manuell eingecheckt`,
        before: null,
        after: entrance,
      })
  })
}
