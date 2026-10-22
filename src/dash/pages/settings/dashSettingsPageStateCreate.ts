import { createEffect } from "solid-js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashIbanFormat } from "../../model/dashIbanFormat.ts"
import { dashIbanMask } from "../../model/dashIbanMask.ts"
import { dashIbanValidate } from "../../model/dashIbanValidate.ts"
import type { DashOrgKind } from "../../model/dashOrgKindSchema.ts"
import type { DashOrgVoucherValidity } from "../../model/dashOrgVoucherValiditySchema.ts"
import { dashSlugCreate } from "../../model/dashSlugCreate.ts"
import type { DashTaxRate } from "../../model/dashTaxRateSchema.ts"
import { dashOrgSettingsUpdate } from "../../store/actions/settings/dashOrgSettingsUpdate.ts"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"

export interface DashSettingsDraft {
  name: string
  kind: DashOrgKind
  slug: string
  bankHolder: string
  bankIban: string
  defaultRateBps: DashTaxRate
  voucherDefaultValidity: DashOrgVoucherValidity
}

const draftFromOrg = (org: NonNullable<ReturnType<typeof dashActiveOrg>>): DashSettingsDraft => ({
  name: org.name,
  kind: org.kind,
  slug: org.slug,
  bankHolder: org.bank.holder,
  bankIban: dashIbanFormat(org.bank.iban),
  defaultRateBps: org.tax.defaultRateBps,
  voucherDefaultValidity: org.voucherDefaultValidity,
})

const draftEqual = (left: DashSettingsDraft, right: DashSettingsDraft): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

/** Formular-Zustand der Einstellungsseite: Entwurf, Validierung, Speichern, Leserechte. */
export function dashSettingsPageStateCreate() {
  const draftSignal = createSignalObject<DashSettingsDraft | null>(null)
  const savingSignal = createSignalObject(false)
  const dangerSignal = createSignalObject(false)
  const contractSignal = createSignalObject<"agb" | "avv" | null>(null)
  const syncedSignal = createSignalObject<string | null>(null)

  const org = () => dashActiveOrg()
  const canEdit = () => dashCan("einstellungen.bearbeiten")
  const maySeeBank = () => dashCan("bank.bearbeiten")
  const readOnly = () => !canEdit()

  createEffect(() => {
    const current = org()
    if (!current) {
      draftSignal.set(null)
      syncedSignal.set(null)
      return
    }
    const snapshot = JSON.stringify(draftFromOrg(current))
    if (syncedSignal.get() === null) {
      draftSignal.set(draftFromOrg(current))
      syncedSignal.set(snapshot)
      return
    }
    if (syncedSignal.get() === snapshot) return
    const pending = draftSignal.get()
    if (pending && draftEqual(pending, JSON.parse(syncedSignal.get() ?? "null") as DashSettingsDraft))
      draftSignal.set(draftFromOrg(current))
    syncedSignal.set(snapshot)
  })

  const draft = () => draftSignal.get()

  const setDraft = (patch: Partial<DashSettingsDraft>): void => {
    if (!canEdit()) return
    const current = draftSignal.get()
    if (!current) return
    draftSignal.set({ ...current, ...patch })
  }

  const dirty = (): boolean => {
    const current = org()
    const pending = draftSignal.get()
    if (!current || !pending) return false
    return !draftEqual(pending, draftFromOrg(current))
  }

  const slugPreview = (): string => {
    const pending = draft()
    if (!pending) return ""
    return dashSlugCreate(pending.slug)
  }

  const slugTaken = (): boolean => {
    const preview = slugPreview()
    if (preview.length === 0) return false
    const current = org()
    return dashStateGet().orgs.some((candidate) => candidate.id !== current?.id && candidate.slug === preview)
  }

  const ibanError = (): string | null => {
    const pending = draft()
    if (!pending) return null
    const raw = pending.bankIban.trim()
    if (raw.length === 0) return "Gib deine IBAN ein."
    const result = dashIbanValidate(raw)
    return result.success ? null : result.errorMessage
  }

  const nameError = (): string | null => {
    const pending = draft()
    if (!pending) return null
    if (pending.name.trim().length < 2) return "Gib einen Namen mit mindestens 2 Zeichen ein."
    if (pending.name.trim().length > 80) return "Dein Name darf höchstens 80 Zeichen haben."
    return null
  }

  const slugError = (): string | null => {
    const pending = draft()
    if (!pending) return null
    if (slugPreview().length < 2) return "Gib einen Profil-Link mit mindestens 2 Zeichen ein."
    if (slugTaken()) return "Dieser Profil-Link ist schon vergeben. Wähl einen anderen."
    return null
  }

  const blocked = (): string | null => nameError() ?? slugError() ?? (maySeeBank() ? ibanError() : null)

  const save = (): void => {
    const current = org()
    const pending = draft()
    if (!current || !pending || savingSignal.get() || !canEdit()) return
    const stop = blocked()
    if (stop) {
      toastAdd({ title: stop, variant: "error" })
      return
    }
    savingSignal.set(true)
    const patch: Parameters<typeof dashOrgSettingsUpdate>[0]["patch"] = {
      name: pending.name.trim(),
      kind: pending.kind,
      slug: slugPreview(),
      tax: { defaultRateBps: pending.defaultRateBps },
      voucherDefaultValidity: pending.voucherDefaultValidity,
    }
    if (maySeeBank()) patch.bank = { holder: pending.bankHolder.trim(), iban: pending.bankIban }
    const result = dashOrgSettingsUpdate({ orgId: current.id, patch })
    savingSignal.set(false)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: "Einstellungen gespeichert", variant: "success" })
  }

  const discard = (): void => {
    const current = org()
    if (current) {
      draftSignal.set(draftFromOrg(current))
      syncedSignal.set(JSON.stringify(draftFromOrg(current)))
    }
    savingSignal.set(false)
  }

  const maskedIban = (): string => {
    const current = org()
    if (!current) return ""
    return dashIbanMask(current.bank.iban)
  }

  const openDanger = (): void => {
    dangerSignal.set(true)
  }

  const closeDanger = (): void => {
    dangerSignal.set(false)
  }

  const confirmDanger = (): void => {
    dangerSignal.set(false)
    toastAdd({ title: "In der Demo deaktiviert", description: "Deine Organisation bleibt erhalten.", variant: "info" })
  }

  const openContract = (which: "agb" | "avv"): void => {
    contractSignal.set(which)
  }

  const closeContract = (): void => {
    contractSignal.set(null)
  }

  const navItems = () => [
    { id: "organisation", label: "Organisation", hash: "#einstellungen-organisation" },
    { id: "auszahlung", label: "Auszahlung", hash: "#einstellungen-auszahlung" },
    { id: "steuern", label: "Steuern", hash: "#einstellungen-steuern" },
    { id: "gebuehren", label: "Gebühren", hash: "#einstellungen-gebuehren" },
    { id: "gutscheine", label: "Gutscheine", hash: "#einstellungen-gutscheine" },
    { id: "vertraege", label: "Verträge", hash: "#einstellungen-vertraege" },
    { id: "protokoll", label: "Protokoll", hash: "#einstellungen-protokoll" },
    { id: "gefahrenzone", label: "Gefahrenzone", hash: "#einstellungen-gefahrenzone" },
  ]

  const scrollToSection = (section: string): void => {
    if (typeof document === "undefined") return
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    document.getElementById(`einstellungen-${section}`)?.scrollIntoView({ behavior, block: "start" })
  }

  return {
    org,
    draft,
    draftSignal,
    savingSignal,
    dangerSignal,
    contractSignal,
    canEdit,
    maySeeBank,
    readOnly,
    setDraft,
    dirty,
    slugPreview,
    slugTaken,
    ibanError,
    nameError,
    slugError,
    blocked,
    save,
    discard,
    maskedIban,
    openDanger,
    closeDanger,
    confirmDanger,
    openContract,
    closeContract,
    navItems,
    scrollToSection,
  }
}

export type DashSettingsPageState = ReturnType<typeof dashSettingsPageStateCreate>
