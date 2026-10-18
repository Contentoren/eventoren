import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Löscht ungenutzte Codes; bereits genutzte bleiben stehen (du sprichst). */
export function dashCodeDelete(
  ids: string[],
  store: DashStore = dashStoreGet(),
): Result<{ deleted: number; skipped: number }> {
  const op = "dashCodeDelete"
  if (ids.length === 0) return createResultError(op, "Bitte wähle mindestens einen Code.")
  const targets = store.state.codes.filter((code) => ids.includes(code.id))
  if (targets.length === 0) return createResultError(op, "Keine Codes gefunden.")
  const deletable = targets.filter((code) => code.usedTickets === 0)
  const skipped = targets.length - deletable.length
  if (deletable.length === 0)
    return createResultError(op, "Alle gewählten Codes wurden bereits genutzt und bleiben erhalten.")
  const deletedIds = new Set(deletable.map((code) => code.id))
  const updated = store.update(op, (draft) => {
    draft.codes = draft.codes.filter((code) => !deletedIds.has(code.id))
    const first = targets[0]
    if (!first) return
    const event = draft.events.find((candidate) => candidate.id === first.eventId)
    if (!event) return
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "codes",
      action: `Code ${first.code} gelöscht`,
      before: first.code,
      after: null,
    })
  })
  if (!updated.success) return createResultError(op, "Die Codes konnten nicht gelöscht werden.")
  return createResult({ deleted: deletable.length, skipped })
}
