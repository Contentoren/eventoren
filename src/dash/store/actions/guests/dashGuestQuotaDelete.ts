import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Löscht ein leeres Gästeliste-Kontingent (mit Gästen belegt → Fehler). */
export function dashGuestQuotaDelete(id: string, store: DashStore = dashStoreGet()): Result<"geloescht"> {
  const op = "dashGuestQuotaDelete"
  const quota = store.state.guestQuotas.find((candidate) => candidate.id === id)
  if (!quota) return createResultError(op, "Kontingent nicht gefunden.")
  const used = store.state.guests.filter((guest) => guest.quotaId === id).length
  if (used > 0)
    return createResultError(
      op,
      `„${quota.name}“ enthält noch ${used} ${used === 1 ? "Gast" : "Gäste"} und kann nicht gelöscht werden.`,
    )
  const updated = store.update(op, (draft) => {
    const index = draft.guestQuotas.findIndex((candidate) => candidate.id === id)
    if (index < 0) throw new Error("Kontingent nicht gefunden.")
    const event = draft.events.find((candidate) => candidate.id === quota.eventId)
    if (!event) throw new Error("Event nicht gefunden.")
    draft.guestQuotas.splice(index, 1)
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "gaesteliste",
      action: `Kontingent „${quota.name}“ gelöscht`,
      before: `${quota.name} · Limit ${quota.limit}`,
      after: null,
    })
  })
  if (!updated.success) return createResultError(op, "Das Kontingent konnte nicht gelöscht werden.")
  return createResult("geloescht")
}
