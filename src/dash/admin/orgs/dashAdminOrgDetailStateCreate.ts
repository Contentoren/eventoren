import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

import type { DashFeePayer } from "../../model/dashFeePayerSchema.ts"
import type { DashTaxRate } from "../../model/dashTaxRateSchema.ts"
import type { DashTaxStatus } from "../../model/dashTaxStatusSchema.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"

export type DashAdminOrgDetailSearch = Record<string, never>

/** Detail-State: Formulare für Gebührenmodell, Steuern und Sperr-Dialog. */
export function dashAdminOrgDetailStateCreate(inputs: { orgId: () => string }) {
  const percentDraft = createSignalObject("")
  const fixedDraft = createSignalObject<number | null>(null)
  const payerDraft = createSignalObject<DashFeePayer>("kaeufer")
  const taxStatusDraft = createSignalObject<DashTaxStatus>("regel")
  const taxRateDraft = createSignalObject<DashTaxRate>(1900)
  const blockOpen = createSignalObject(false)
  const blockReason = createSignalObject("")
  const seededFor = createSignalObject<string | null>(null)

  const org = createMemo(() => dashStateGet().orgs.find((candidate) => candidate.id === inputs.orgId()) ?? null)

  const seed = () => {
    const current = org()
    if (!current) return
    if (seededFor.get() === current.id) return
    seededFor.set(current.id)
    percentDraft.set((current.fee.percentBps / 100).toFixed(2) ?? "")
    fixedDraft.set(current.fee.fixedCents)
    payerDraft.set(current.fee.payer)
    taxStatusDraft.set(current.tax.status)
    taxRateDraft.set(current.tax.defaultRateBps)
    blockReason.set("")
  }

  const feeDirty = createMemo(() => {
    const current = org()
    if (!current) return false
    const parsed = percentDraft.get().trim().replace(/\s/gu, "").replace(",", ".")
    const percentBps = parsed === "" ? Number.NaN : Math.round(Number(parsed) * 100)
    return (
      percentBps !== current.fee.percentBps ||
      fixedDraft.get() !== current.fee.fixedCents ||
      payerDraft.get() !== current.fee.payer
    )
  })

  const feeError = createMemo((): string | null => {
    const parsed = percentDraft.get().trim().replace(/\s/gu, "").replace(",", ".")
    if (parsed === "") return "Prozentsatz eingeben."
    if (!/^\d+(?:\.\d{1,2})?$/u.test(parsed)) return "Format: z. B. 5 oder 4,5."
    const bps = Math.round(Number(parsed) * 100)
    if (!Number.isFinite(bps) || bps < 0 || bps > 2000) return "Zwischen 0 % und 20 %."
    if (fixedDraft.get() === null) return "Fixbetrag eingeben."
    return null
  })

  const taxDirty = createMemo(() => {
    const current = org()
    if (!current) return false
    return taxStatusDraft.get() !== current.tax.status || taxRateDraft.get() !== current.tax.defaultRateBps
  })

  return {
    org,
    seed,
    percentDraft,
    fixedDraft,
    payerDraft,
    taxStatusDraft,
    taxRateDraft,
    blockOpen,
    blockReason,
    feeDirty,
    feeError,
    taxDirty,
  }
}

export type DashAdminOrgDetailState = ReturnType<typeof dashAdminOrgDetailStateCreate>
