import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Schaltet Codes an oder aus (du sprichst) – sofort wirksam. */
export function dashCodeSetActive(ids: string[], active: boolean, store: DashStore = dashStoreGet()): Result<number> {
  const op = "dashCodeSetActive"
  if (ids.length === 0) return createResultError(op, "Bitte wähle mindestens einen Code.")
  const targets = store.state.codes.filter((code) => ids.includes(code.id))
  if (targets.length === 0) return createResultError(op, "Keine Codes gefunden.")
  const updated = store.update(op, (draft) => {
    for (const target of draft.codes) {
      if (!ids.includes(target.id)) continue
      target.active = active
    }
    const first = targets[0]
    if (!first) return
    const event = draft.events.find((candidate) => candidate.id === first.eventId)
    if (!event) return
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "codes",
      action: active ? `Code ${first.code} geändert` : `Code ${first.code} geändert`,
      before: active ? "inaktiv" : "aktiv",
      after: active ? "aktiv" : "inaktiv",
    })
  })
  if (!updated.success) return createResultError(op, "Die Codes konnten nicht umgeschaltet werden.")
  return createResult(targets.length)
}
