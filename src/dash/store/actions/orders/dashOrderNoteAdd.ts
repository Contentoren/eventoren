import { createResult, createResultError, type Result } from "#result"

import type { DashNote } from "../../../model/dashNoteSchema.ts"
import { dashSessionUserIn } from "../../dashSessionUserIn.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export function dashOrderNoteAdd(
  args: { orderId: string; text: string },
  store: DashStore = dashStoreGet(),
): Result<DashNote> {
  const op = "dashOrderNoteAdd"
  const order = store.state.orders.find((candidate) => candidate.id === args.orderId)
  if (!order) return createResultError(op, "Bestellung nicht gefunden.")
  const text = args.text.trim()
  if (!text) return createResultError(op, "Bitte gib einen Notiztext an.")
  if (text.length > 1000) return createResultError(op, "Die Notiz darf maximal 1000 Zeichen lang sein.")
  const user = dashSessionUserIn(store.state)
  const author = user?.name?.trim() ? user.name.trim() : "Demo"
  const note: DashNote = { id: dashIdCreate("note"), text, author, at: new Date().toISOString() }
  const updated = store.update(op, (draft) => {
    const target = draft.orders.find((candidate) => candidate.id === args.orderId)
    if (!target) throw new Error("Bestellung nicht gefunden.")
    target.notes.push({ ...note })
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.eventId,
      area: "bestellungen",
      action: `Notiz zu Bestellung ${target.number} hinzugefügt`,
      before: null,
      after: text.length > 120 ? `${text.slice(0, 120)}…` : text,
    })
  })
  if (!updated.success) return createResultError(op, "Die Notiz konnte nicht gespeichert werden.")
  return createResult(note)
}
