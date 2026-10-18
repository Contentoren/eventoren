import { createResult, createResultError, type Result } from "#result"

import type { DashMessage } from "../../../model/dashMessageSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Plant eine Nachricht für die Zukunft (du sprichst). */
export function dashMessageSchedule(
  id: string,
  scheduledAt: string,
  store: DashStore = dashStoreGet(),
): Result<DashMessage> {
  const op = "dashMessageSchedule"
  const message = store.state.messages.find((candidate) => candidate.id === id)
  if (!message) return createResultError(op, "Nachricht nicht gefunden.")
  if (message.status === "gesendet") return createResultError(op, "Gesendete Nachrichten kannst du nicht mehr planen.")
  const at = Date.parse(scheduledAt)
  if (Number.isNaN(at)) return createResultError(op, "Der geplante Zeitpunkt ist ungültig.")
  if (at <= Date.now()) return createResultError(op, "Der geplante Zeitpunkt muss in der Zukunft liegen.")
  const event = store.state.events.find((candidate) => candidate.id === message.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const updated: DashMessage = { ...message, status: "geplant", scheduledAt, sentAt: null }
  const saved = store.update(op, (draft) => {
    const index = draft.messages.findIndex((candidate) => candidate.id === id)
    if (index < 0) throw new Error("Nachricht nicht gefunden.")
    draft.messages[index] = updated
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "nachrichten",
      action: `Nachricht „${message.subject}“ geplant`,
      before: message.status,
      after: scheduledAt,
    })
  })
  if (!saved.success) return createResultError(op, "Die Nachricht konnte nicht geplant werden.")
  return createResult(updated)
}
