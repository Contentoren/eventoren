import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Benennt eine Vorlage um (Name je Organisation eindeutig). */
export function dashTemplateRename(id: string, name: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashTemplateRename"
  const template = store.state.templates.find((candidate) => candidate.id === id)
  if (!template) return createResultError(op, "Vorlage nicht gefunden.")
  const next = name.trim()
  if (!next) return createResultError(op, "Bitte gib einen Namen für die Vorlage an.")
  if (
    store.state.templates.some(
      (candidate) => candidate.id !== id && candidate.orgId === template.orgId && candidate.name === next,
    )
  )
    return createResultError(op, "Es gibt schon eine Vorlage mit diesem Namen.")
  const before = template.name
  return store.update(op, (draft) => {
    const target = draft.templates.find((candidate) => candidate.id === id)
    if (!target) throw new Error("Vorlage nicht gefunden.")
    target.name = next
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: null,
      area: "event",
      action: `Vorlage „${before}“ in „${next}“ umbenannt`,
      before,
      after: next,
    })
  })
}
