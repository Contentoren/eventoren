import { createResultError, type Result } from "#result"

import { dashEventPublishCheck } from "../../../model/dashEventPublishCheck.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Veröffentlicht ein Event, wenn die Pflichtpunkte der Setup-Checkliste erfüllt sind. */
export function dashEventPublish(eventId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashEventPublish"
  const event = store.state.events.find((candidate) => candidate.id === eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  if (event.status === "abgesagt") return createResultError(op, "Abgesagte Events können nicht veröffentlicht werden.")
  const org = store.state.orgs.find((candidate) => candidate.id === event.orgId) ?? null
  const check = dashEventPublishCheck(
    event,
    store.state.ticketTypes.filter((candidate) => candidate.eventId === event.id),
    org,
  )
  if (!check.ok) {
    const missing = check.items
      .filter((item) => item.required && !item.done)
      .map((item) => item.label)
      .join(", ")
    return createResultError(op, `Zum Veröffentlichen fehlt noch: ${missing}.`)
  }
  const nowIso = new Date().toISOString()
  return store.update(op, (draft) => {
    const target = draft.events.find((candidate) => candidate.id === eventId)
    if (!target) throw new Error("Event nicht gefunden.")
    target.status = "veroeffentlicht"
    target.updatedAt = nowIso
    if (target.publishedAt === null) target.publishedAt = nowIso
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.id,
      area: "event",
      action: `Event „${target.title}“ veröffentlicht`,
      before: "Entwurf",
      after: "Veröffentlicht",
    })
  })
}
