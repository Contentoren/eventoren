import { createResultError, type Result } from "#result"

import type { DashTaxRate } from "../../../model/dashTaxRateSchema.ts"
import type { DashTaxStatus } from "../../../model/dashTaxStatusSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashAdminOrgTaxInput = {
  orgId: string
  status: DashTaxStatus
  defaultRateBps: DashTaxRate
}

const taxRates: DashTaxRate[] = [1900, 700]

/** Aktualisiert die Steuereinstellung einer Organisation. */
export function dashAdminOrgTaxUpdate(input: DashAdminOrgTaxInput, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashAdminOrgTaxUpdate"
  const org = store.state.orgs.find((candidate) => candidate.id === input.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  if (input.status !== "regel" && input.status !== "klein") return createResultError(op, "Ungültiger Steuerstatus.")
  if (!taxRates.includes(input.defaultRateBps)) return createResultError(op, "Ungültiger Steuersatz.")
  return store.update(op, (draft) => {
    const target = draft.orgs.find((candidate) => candidate.id === input.orgId)
    if (!target) throw new Error("Organisation nicht gefunden.")
    const before = target.tax.status === "regel" ? "Regelbesteuerung" : "Kleinunternehmer"
    target.tax = { status: input.status, defaultRateBps: input.defaultRateBps }
    const after = input.status === "regel" ? "Regelbesteuerung" : "Kleinunternehmer"
    dashAuditAdd(draft, {
      orgId: target.id,
      eventId: null,
      area: "admin",
      action: `Steuern von „${target.name}“ geändert`,
      before,
      after,
    })
  })
}
