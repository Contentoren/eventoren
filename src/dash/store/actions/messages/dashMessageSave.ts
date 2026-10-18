import { createResult, createResultError, type Result } from "#result"

import type { DashMessage } from "../../../model/dashMessageSchema.ts"
import type { DashMessageAudience } from "../../../model/dashMessageAudienceSchema.ts"
import type { DashMessageKind } from "../../../model/dashMessageKindSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashMessageSaveInput = {
  id?: string
  eventId: string
  kind: DashMessageKind
  audience: DashMessageAudience
  subject: string
  body: string
}

/** Speichert eine Nachricht als Entwurf (du sprichst). */
export function dashMessageSave(input: DashMessageSaveInput, store: DashStore = dashStoreGet()): Result<DashMessage> {
  const op = "dashMessageSave"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const subject = input.subject.trim()
  if (!subject) return createResultError(op, "Bitte gib einen Betreff ein.")
  const body = input.body.trim()
  if (!body) return createResultError(op, "Bitte gib einen Nachrichtentext ein.")
  const nowIso = new Date().toISOString()
  const existing = input.id ? store.state.messages.find((candidate) => candidate.id === input.id) : null
  if (existing && existing.status !== "entwurf" && existing.status !== "geplant")
    return createResultError(op, "Gesendete Nachrichten kannst du nicht mehr ändern.")
  const id = existing?.id ?? dashIdCreate("msg")
  const next: DashMessage = {
    id,
    eventId: input.eventId,
    kind: input.kind,
    audience: { type: input.audience.type, ticketTypeIds: [...input.audience.ticketTypeIds] },
    subject,
    body,
    status: "entwurf",
    scheduledAt: null,
    sentAt: null,
    recipientCount: 0,
    openRateBps: null,
  }
  const saved = store.update(op, (draft) => {
    const index = draft.messages.findIndex((candidate) => candidate.id === id)
    if (index < 0) draft.messages.push(next)
    else draft.messages[index] = next
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "nachrichten",
      action: `Nachricht „${subject}“ als Entwurf gespeichert`,
      before: null,
      after: subject,
    })
  })
  if (!saved.success) return createResultError(op, "Die Nachricht konnte nicht gespeichert werden.")
  return createResult(next)
}
