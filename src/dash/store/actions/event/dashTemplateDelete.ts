import { createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Löscht eine Vorlage. */
export function dashTemplateDelete(id: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashTemplateDelete"
  const template = store.state.templates.find((candidate) => candidate.id === id)
  if (!template) return createResultError(op, "Vorlage nicht gefunden.")
  const name = template.name
  return store.update(op, (draft) => {
    const index = draft.templates.findIndex((candidate) => candidate.id === id)
    if (index < 0) throw new Error("Vorlage nicht gefunden.")
    draft.templates.splice(index, 1)
    dashAuditAdd(draft, {
      orgId: template.orgId,
      eventId: null,
      area: "event",
      action: `Vorlage „${name}“ gelöscht`,
      before: name,
      after: null,
    })
  })
}
