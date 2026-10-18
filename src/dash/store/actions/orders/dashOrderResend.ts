import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export function dashOrderResend(orderId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashOrderResend"
  const order = store.state.orders.find((candidate) => candidate.id === orderId)
  if (!order) return createResultError(op, "Bestellung nicht gefunden.")
  const nowIso = new Date().toISOString()
  const updated = store.update(op, (draft) => {
    const target = draft.orders.find((candidate) => candidate.id === orderId)
    if (!target) throw new Error("Bestellung nicht gefunden.")
    target.emails.push({ at: nowIso, to: target.buyer.email, kind: "tickets-erneut" })
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: target.eventId,
      area: "bestellungen",
      action: `Tickets für Bestellung ${target.number} erneut gesendet`,
      before: null,
      after: target.buyer.email,
    })
  })
  if (!updated.success) return createResultError(op, "Die Tickets konnten nicht erneut gesendet werden.")
  return createResult(undefined)
}
