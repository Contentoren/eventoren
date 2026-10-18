import { createResult, createResultError, type Result } from "#result"

import type { DashBoxOfficeSale } from "../../../model/dashBoxOfficeSaleSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import type { DashStore } from "../../dashStoreCreate.ts"

/** Bricht einen wartenden Abendkassen-Vorgang ab. */
export function dashBoxOfficeSaleCancel(saleId: string, store: DashStore = dashStoreGet()): Result<DashBoxOfficeSale> {
  const op = "dashBoxOfficeSaleCancel"
  const sale = store.state.boxOfficeSales.find((candidate) => candidate.id === saleId)
  if (!sale) return createResultError(op, "Vorgang nicht gefunden.")
  if (sale.status === "bezahlt") return createResultError(op, "Dieser Vorgang ist schon bezahlt.")
  if (sale.status === "abgebrochen") return createResultError(op, "Dieser Vorgang wurde schon abgebrochen.")
  const event = store.state.events.find((candidate) => candidate.id === sale.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const updated = store.update(op, (draft) => {
    const target = draft.boxOfficeSales.find((candidate) => candidate.id === saleId)
    if (!target) throw new Error("Vorgang nicht gefunden.")
    target.status = "abgebrochen"
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "abendkasse",
      action: "Abendkassen-Vorgang abgebrochen",
      before: "wartet",
      after: "abgebrochen",
    })
  })
  if (!updated.success) return createResultError(op, "Der Vorgang konnte nicht abgebrochen werden.")
  const current = store.state.boxOfficeSales.find((candidate) => candidate.id === saleId)
  if (!current) return createResultError(op, "Vorgang nicht gefunden.")
  return createResult(current)
}
