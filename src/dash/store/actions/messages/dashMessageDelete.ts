import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Löscht einen Entwurf oder eine geplante Nachricht (du sprichst). */
export function dashMessageDelete(id: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashMessageDelete"
  const message = store.state.messages.find((candidate) => candidate.id === id)
  if (!message) return createResultError(op, "Nachricht nicht gefunden.")
  if (message.status === "gesendet") return createResultError(op, "Gesendete Nachrichten kannst du nicht löschen.")
  const event = store.state.events.find((candidate) => candidate.id === message.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const saved = store.update(op, (draft) => {
    const index = draft.messages.findIndex((candidate) => candidate.id === id)
    if (index < 0) throw new Error("Nachricht nicht gefunden.")
    draft.messages.splice(index, 1)
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "nachrichten",
      action: `Nachricht „${message.subject}“ gelöscht`,
      before: message.subject,
      after: null,
    })
  })
  if (!saved.success) return createResultError(op, "Die Nachricht konnte nicht gelöscht werden.")
  return createResult(undefined)
}
