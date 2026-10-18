import { createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Pausiert den Verkauf oder setzt ihn fort (sofort wirksam). */
export function dashEventSalesPause(eventId: string, paused: boolean, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashEventSalesPause"
  const event = store.state.events.find((candidate) => candidate.id === eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  if (event.salesPaused === paused)
    return createResultError(op, paused ? "Der Verkauf ist schon pausiert." : "Der Verkauf läuft schon.")
  return store.update(op, (draft) => {
    const target = draft.events.find((candidate) => candidate.id === eventId)
    if (!target) throw new Error("Event nicht gefunden.")
    target.salesPaused = paused
    target.updatedAt = new Date().toISOString()
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.id,
      area: "event",
      action: paused ? `Verkauf für „${target.title}“ pausiert` : `Verkauf für „${target.title}“ fortgesetzt`,
      before: paused ? "Im Verkauf" : "Pausiert",
      after: paused ? "Pausiert" : "Im Verkauf",
    })
  })
}
