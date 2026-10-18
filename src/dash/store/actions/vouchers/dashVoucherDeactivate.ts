import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Deaktiviert einen Gutschein (du sprichst): kein Einlösen mehr möglich, Guthaben bleibt sichtbar. */
export function dashVoucherDeactivate(id: string, store: DashStore = dashStoreGet()): Result<string> {
  const op = "dashVoucherDeactivate"
  const voucher = store.state.vouchers.find((candidate) => candidate.id === id)
  if (!voucher) return createResultError(op, "Gutschein nicht gefunden.")
  if (voucher.status === "deaktiviert") return createResultError(op, "Der Gutschein ist schon deaktiviert.")
  const stored = store.update(op, (draft) => {
    const target = draft.vouchers.find((candidate) => candidate.id === id)
    if (!target) return
    const before = target.status
    target.status = "deaktiviert"
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: null,
      area: "codes",
      action: `Gutschein ${target.code} deaktiviert`,
      before,
      after: "deaktiviert",
    })
  })
  if (!stored.success) return createResultError(op, "Der Gutschein konnte nicht deaktiviert werden.")
  return createResult(voucher.code)
}
