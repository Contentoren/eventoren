import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { dashIbanValidate } from "../../../model/dashIbanValidate.ts"
import type { DashOrgKind } from "../../../model/dashOrgKindSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import { dashOrgSchema } from "../../../model/dashOrgSchema.ts"
import type { DashOrgVoucherValidity } from "../../../model/dashOrgVoucherValiditySchema.ts"
import { dashSlugCreate } from "../../../model/dashSlugCreate.ts"
import type { DashTaxRate } from "../../../model/dashTaxRateSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export interface DashOrgSettingsPatch {
  name?: string
  kind?: DashOrgKind
  slug?: string
  bank?: { holder: string; iban: string }
  tax?: { defaultRateBps: DashTaxRate }
  voucherDefaultValidity?: DashOrgVoucherValidity
}

function dashOrgSettingsChanges(org: DashOrg, patch: DashOrgSettingsPatch): string[] {
  const changed: string[] = []
  if (patch.name !== undefined && patch.name !== org.name) changed.push("Name")
  if (patch.kind !== undefined && patch.kind !== org.kind) changed.push("Art")
  if (patch.slug !== undefined && patch.slug !== org.slug) changed.push("Profil-Link")
  if (patch.bank !== undefined && (patch.bank.holder !== org.bank.holder || patch.bank.iban !== org.bank.iban))
    changed.push("Bankverbindung")
  if (patch.tax !== undefined && patch.tax.defaultRateBps !== org.tax.defaultRateBps)
    changed.push("Standard-Steuersatz")
  if (patch.voucherDefaultValidity !== undefined && patch.voucherDefaultValidity !== org.voucherDefaultValidity)
    changed.push("Gutschein-Laufzeit")
  return changed
}

/** Ermittelt lesbare Feldnamen aller geänderten Einstellungswerte. */
export function dashOrgSettingsChangeLabels(org: DashOrg, patch: DashOrgSettingsPatch): string[] {
  return dashOrgSettingsChanges(org, patch)
}

/** Aktualisiert Org-Einstellungen (Organisation, Bank, Steuern, Gutschein-Laufzeit) und schreibt ein Audit in „einstellungen“. */
export function dashOrgSettingsUpdate(
  input: { orgId: string; patch: DashOrgSettingsPatch },
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashOrgSettingsUpdate"
  const org = store.state.orgs.find((candidate) => candidate.id === input.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  const { patch } = input
  const next: DashOrg = { ...org, bank: { ...org.bank }, tax: { ...org.tax } }

  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (name.length < 2) return createResultError(op, "Gib einen Namen mit mindestens 2 Zeichen ein.")
    if (name.length > 80) return createResultError(op, "Dein Name darf höchstens 80 Zeichen haben.")
    next.name = name
  }
  if (patch.kind !== undefined) {
    if (patch.kind !== "verein" && patch.kind !== "unternehmen" && patch.kind !== "schule" && patch.kind !== "privat")
      return createResultError(op, "Wähl eine gültige Organisationsart.", undefined)
    next.kind = patch.kind
  }
  if (patch.slug !== undefined) {
    const slug = dashSlugCreate(patch.slug)
    if (slug.length < 2) return createResultError(op, "Gib einen Profil-Link mit mindestens 2 Zeichen ein.")
    if (slug.length > 60) return createResultError(op, "Dein Profil-Link darf höchstens 60 Zeichen haben.")
    const taken = store.state.orgs.some((candidate) => candidate.id !== org.id && candidate.slug === slug)
    if (taken) return createResultError(op, "Dieser Profil-Link ist schon vergeben. Wähl einen anderen.")
    next.slug = slug
  }
  if (patch.bank !== undefined) {
    const holder = patch.bank.holder.trim()
    if (holder.length < 2) return createResultError(op, "Gib den Kontoinhaber mit mindestens 2 Zeichen ein.")
    const ibanResult = dashIbanValidate(patch.bank.iban)
    if (!ibanResult.success) return createResultError(op, ibanResult.errorMessage)
    next.bank = { holder, iban: ibanResult.data }
  }
  if (patch.tax !== undefined) {
    if (patch.tax.defaultRateBps !== 1900 && patch.tax.defaultRateBps !== 700)
      return createResultError(op, "Wähl 19 % oder 7 % als Standard-Steuersatz.")
    next.tax = { ...next.tax, defaultRateBps: patch.tax.defaultRateBps }
  }
  if (patch.voucherDefaultValidity !== undefined) {
    if (
      patch.voucherDefaultValidity !== "1-jahr" &&
      patch.voucherDefaultValidity !== "2-jahre" &&
      patch.voucherDefaultValidity !== "3-jahre-jahresende" &&
      patch.voucherDefaultValidity !== "unbegrenzt"
    )
      return createResultError(op, "Wähl eine gültige Standard-Laufzeit für Gutscheine.")
    next.voucherDefaultValidity = patch.voucherDefaultValidity
  }

  const changed = dashOrgSettingsChanges(org, { ...patch, slug: patch.slug === undefined ? undefined : next.slug })
  if (changed.length === 0) return createResult(undefined)
  if (!v.safeParse(dashOrgSchema, next).success) return createResultError(op, "Deine Einstellungs-Daten sind ungültig.")
  return store.update(op, (draft) => {
    const target = draft.orgs.find((candidate) => candidate.id === input.orgId)
    if (!target) throw new Error("Organisation nicht gefunden.")
    Object.assign(target, next)
    dashAuditAdd(draft, {
      orgId: target.id,
      eventId: null,
      area: "einstellungen",
      action: `Einstellungen aktualisiert (${changed.join(", ")})`,
    })
  })
}
