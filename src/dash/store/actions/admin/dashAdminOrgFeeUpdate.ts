import { createResultError, type Result } from "#result"

import type { DashFeePayer } from "../../../model/dashFeePayerSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashAdminOrgFeeInput = {
  orgId: string
  percentBps: number
  fixedCents: number
  payer: DashFeePayer
}

const feePayers: DashFeePayer[] = ["kaeufer", "veranstalter"]

/** Aktualisiert das Gebührenmodell einer Organisation. */
export function dashAdminOrgFeeUpdate(input: DashAdminOrgFeeInput, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashAdminOrgFeeUpdate"
  const org = store.state.orgs.find((candidate) => candidate.id === input.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  if (!Number.isInteger(input.percentBps) || input.percentBps < 0 || input.percentBps > 2000)
    return createResultError(op, "Der Prozentsatz muss zwischen 0 % und 20 % liegen.")
  if (!Number.isInteger(input.fixedCents) || input.fixedCents < 0 || input.fixedCents > 500)
    return createResultError(op, "Der Fixbetrag muss zwischen 0,00 € und 5,00 € liegen.")
  if (!feePayers.includes(input.payer)) return createResultError(op, "Ungültiger Gebührenträger.")
  return store.update(op, (draft) => {
    const target = draft.orgs.find((candidate) => candidate.id === input.orgId)
    if (!target) throw new Error("Organisation nicht gefunden.")
    const before = `${(target.fee.percentBps / 100).toFixed(2).replace(".", ",")} % + ${(target.fee.fixedCents / 100).toFixed(2).replace(".", ",")} €`
    target.fee = { percentBps: input.percentBps, fixedCents: input.fixedCents, payer: input.payer }
    const after = `${(input.percentBps / 100).toFixed(2).replace(".", ",")} % + ${(input.fixedCents / 100).toFixed(2).replace(".", ",")} €`
    dashAuditAdd(draft, {
      orgId: target.id,
      eventId: null,
      area: "admin",
      action: `Gebührenmodell von „${target.name}“ geändert`,
      before,
      after,
    })
  })
}
