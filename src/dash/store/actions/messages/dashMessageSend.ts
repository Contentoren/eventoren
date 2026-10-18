import { createResult, createResultError, type Result } from "#result"

import type { DashMessage } from "../../../model/dashMessageSchema.ts"
import { dashMessageRecipientsCount } from "../../../pages/messages/model/dashMessageRecipientsCount.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Sendet eine Nachricht sofort (du sprichst). */
export function dashMessageSend(id: string, store: DashStore = dashStoreGet()): Result<DashMessage> {
  const op = "dashMessageSend"
  const message = store.state.messages.find((candidate) => candidate.id === id)
  if (!message) return createResultError(op, "Nachricht nicht gefunden.")
  if (message.status === "gesendet") return createResultError(op, "Die Nachricht wurde schon gesendet.")
  const event = store.state.events.find((candidate) => candidate.id === message.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const nowIso = new Date().toISOString()
  const recipientCount = dashMessageRecipientsCount(store.state, message.eventId, message.audience)
  const updated: DashMessage = {
    ...message,
    status: "gesendet",
    scheduledAt: null,
    sentAt: nowIso,
    recipientCount,
    openRateBps: null,
  }
  const saved = store.update(op, (draft) => {
    const index = draft.messages.findIndex((candidate) => candidate.id === id)
    if (index < 0) throw new Error("Nachricht nicht gefunden.")
    draft.messages[index] = updated
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "nachrichten",
      action: `Nachricht „${message.subject}“ an ${recipientCount} Empfänger gesendet`,
      before: message.status,
      after: "gesendet",
    })
  })
  if (!saved.success) return createResultError(op, "Die Nachricht konnte nicht gesendet werden.")
  return createResult(updated)
}
