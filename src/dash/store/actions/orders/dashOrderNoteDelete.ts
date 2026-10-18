import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export function dashOrderNoteDelete(
  args: { orderId: string; noteId: string },
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashOrderNoteDelete"
  const order = store.state.orders.find((candidate) => candidate.id === args.orderId)
  if (!order) return createResultError(op, "Bestellung nicht gefunden.")
  if (!order.notes.some((note) => note.id === args.noteId)) return createResultError(op, "Notiz nicht gefunden.")
  const updated = store.update(op, (draft) => {
    const target = draft.orders.find((candidate) => candidate.id === args.orderId)
    if (!target) throw new Error("Bestellung nicht gefunden.")
    const index = target.notes.findIndex((note) => note.id === args.noteId)
    if (index < 0) throw new Error("Notiz nicht gefunden.")
    target.notes.splice(index, 1)
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.eventId,
      area: "bestellungen",
      action: `Notiz von Bestellung ${target.number} entfernt`,
      before: null,
      after: null,
    })
  })
  if (!updated.success) return createResultError(op, "Die Notiz konnte nicht gelöscht werden.")
  return createResult(undefined)
}
