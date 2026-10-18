import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

function dashAdminPayoutReferenceCreate(taken: Set<string>): string {
  let counter = 1000
  while (taken.has(`AUS-2026-${counter}`)) counter += 1
  const reference = `AUS-2026-${counter}`
  taken.add(reference)
  return reference
}

/** Markiert bereite Auszahlungen als ausgezahlt; vergibt fehlende Referenzen und protokolliert je Auszahlung. */
export function dashAdminPayoutMarkPaid(ids: string[], store: DashStore = dashStoreGet()): Result<{ updated: number }> {
  const op = "dashAdminPayoutMarkPaid"
  const targets = store.state.payouts.filter((payout) => ids.includes(payout.id) && payout.status === "bereit")
  if (targets.length === 0) return createResultError(op, "Keine bereite Auszahlung ausgewählt.")
  const updated = store.update(op, (draft) => {
    const taken = new Set(draft.payouts.map((payout) => payout.reference))
    const nowIso = new Date().toISOString()
    for (const payout of draft.payouts) {
      if (!ids.includes(payout.id) || payout.status !== "bereit") continue
      payout.status = "ausgezahlt"
      payout.paidAt = nowIso
      if (payout.reference.trim() === "") payout.reference = dashAdminPayoutReferenceCreate(taken)
      else taken.add(payout.reference)
      dashAuditAdd(draft, {
        orgId: payout.orgId,
        eventId: payout.eventId,
        area: "admin",
        action: `Auszahlung ${payout.reference} als ausgezahlt markiert`,
        before: "Bereit",
        after: "Ausgezahlt",
      })
    }
  })
  if (!updated.success) return createResultError(op, updated.errorMessage)
  return createResult({ updated: targets.length })
}
