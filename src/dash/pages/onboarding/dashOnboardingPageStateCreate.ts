import * as v from "valibot"
import { useNavigate } from "@tanstack/solid-router"
import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"

import { dashOnboardingDraftCreate, type DashOnboardingDraft } from "./model/dashOnboardingDraftCreate.ts"
import { dashOnboardingValidate } from "./model/dashOnboardingValidate.ts"
import { dashIbanFormat } from "../../model/dashIbanFormat.ts"
import { dashSlugCreate } from "../../model/dashSlugCreate.ts"
import { dashSessionUser } from "../../store/dashSessionUser.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashOnboardingComplete } from "../../store/actions/onboarding/dashOnboardingComplete.ts"

const onboardingStorageKey = "eventoren-demo-onboarding"

const onboardingDraftSchema = v.object({
  accountName: v.string(),
  accountEmail: v.string(),
  accountPassword: v.string(),
  kind: v.picklist(["verein", "unternehmen", "schule", "privat"]),
  orgName: v.string(),
  slug: v.string(),
  slugTouched: v.boolean(),
  logoDataUrl: v.nullable(v.string()),
  legalName: v.string(),
  street: v.string(),
  zip: v.string(),
  city: v.string(),
  representative: v.string(),
  register: v.string(),
  vatId: v.string(),
  taxStatus: v.picklist(["regel", "klein"]),
  holder: v.string(),
  iban: v.string(),
  termsAccepted: v.boolean(),
  dpaAccepted: v.boolean(),
})

/** Zustand des Onboarding-Assistenten: 5 Schritte, Entwurf in sessionStorage, Abschluss beim Verlassen von Schritt 4. */
export function dashOnboardingPageStateCreate(inputs: { step: () => number; onStep: (step: number) => void }) {
  const navigate = useNavigate()
  const sessionUser = () => dashSessionUser()
  const sessionHasName = () => (sessionUser()?.name.trim().length ?? 0) > 0
  const initial = dashOnboardingDraftCreate(sessionUser()?.name ?? "")

  const accountName = createSignalObject(initial.accountName)
  const accountEmail = createSignalObject(initial.accountEmail)
  const accountPassword = createSignalObject(initial.accountPassword)
  const showPassword = createSignalObject(false)
  const kind = createSignalObject<DashOnboardingDraft["kind"]>(initial.kind)
  const orgName = createSignalObject(initial.orgName)
  const slug = createSignalObject(initial.slug)
  const slugTouched = createSignalObject(initial.slugTouched)
  const logoDataUrl = createSignalObject<string | null>(initial.logoDataUrl)
  const legalName = createSignalObject(initial.legalName)
  const street = createSignalObject(initial.street)
  const zip = createSignalObject(initial.zip)
  const city = createSignalObject(initial.city)
  const representative = createSignalObject(initial.representative)
  const register = createSignalObject(initial.register)
  const vatId = createSignalObject(initial.vatId)
  const taxStatus = createSignalObject<DashOnboardingDraft["taxStatus"]>(initial.taxStatus)
  const holder = createSignalObject(initial.holder)
  const iban = createSignalObject(initial.iban)
  const termsAccepted = createSignalObject(initial.termsAccepted)
  const dpaAccepted = createSignalObject(initial.dpaAccepted)
  const showErrors = createSignalObject(false)
  const saving = createSignalObject(false)
  const createdOrgId = createSignalObject<string | null>(null)
  const readSheet = createSignalObject<"agb" | "avv" | null>(null)

  const draft = (): DashOnboardingDraft => ({
    accountName: accountName.get(),
    accountEmail: accountEmail.get(),
    accountPassword: accountPassword.get(),
    kind: kind.get(),
    orgName: orgName.get(),
    slug: slug.get(),
    slugTouched: slugTouched.get(),
    logoDataUrl: logoDataUrl.get(),
    legalName: legalName.get(),
    street: street.get(),
    zip: zip.get(),
    city: city.get(),
    representative: representative.get(),
    register: register.get(),
    vatId: vatId.get(),
    taxStatus: taxStatus.get(),
    holder: holder.get(),
    iban: iban.get(),
    termsAccepted: termsAccepted.get(),
    dpaAccepted: dpaAccepted.get(),
  })

  const takenSlugs = () => dashStateGet().orgs.map((org) => org.slug)

  const errors = () => dashOnboardingValidate(inputs.step(), draft(), takenSlugs())

  const accountSkipped = () => sessionHasName()

  const errorsFor = (step: number) => dashOnboardingValidate(step, draft(), takenSlugs())

  let persistTimer: ReturnType<typeof setTimeout> | null = null
  const persistDraft = () => {
    if (typeof window === "undefined" || createdOrgId.get() !== null) return
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = null
      try {
        window.sessionStorage.setItem(onboardingStorageKey, JSON.stringify(draft()))
      } catch {
        // Session-Storage voll oder blockiert – Entwurf bleibt nur im Speicher
      }
    }, 300)
  }

  const persistClear = () => {
    try {
      window.sessionStorage.removeItem(onboardingStorageKey)
    } catch {
      // ignorieren
    }
  }

  onMount(() => {
    try {
      const raw = window.sessionStorage.getItem(onboardingStorageKey)
      if (raw) {
        const parsed = v.safeParse(onboardingDraftSchema, JSON.parse(raw) as unknown)
        if (parsed.success) {
          const restored = parsed.output
          accountName.set(restored.accountName)
          accountEmail.set(restored.accountEmail)
          accountPassword.set(restored.accountPassword)
          kind.set(restored.kind)
          orgName.set(restored.orgName)
          slug.set(restored.slug)
          slugTouched.set(restored.slugTouched)
          logoDataUrl.set(restored.logoDataUrl)
          legalName.set(restored.legalName)
          street.set(restored.street)
          zip.set(restored.zip)
          city.set(restored.city)
          representative.set(restored.representative)
          register.set(restored.register)
          vatId.set(restored.vatId)
          taxStatus.set(restored.taxStatus)
          holder.set(restored.holder)
          iban.set(restored.iban)
          termsAccepted.set(restored.termsAccepted)
          dpaAccepted.set(restored.dpaAccepted)
        }
      }
    } catch {
      // ungültiger Entwurf wird ignoriert
    }
    if (!sessionHasName() && accountName.get().trim().length === 0) accountName.set(sessionUser()?.name ?? "")
  })

  const set = <T>(signal: { set: (value: T) => void }, value: T) => {
    signal.set(value)
    persistDraft()
  }

  const setOrgName = (value: string) => {
    orgName.set(value)
    if (!slugTouched.get()) slug.set(dashSlugCreate(value))
    persistDraft()
  }

  const setSlug = (value: string) => {
    slug.set(value)
    slugTouched.set(true)
    persistDraft()
  }

  const formatIban = () => {
    const formatted = dashIbanFormat(iban.get())
    if (formatted !== iban.get()) {
      iban.set(formatted)
      persistDraft()
    }
  }

  const goStep = (next: number) => {
    const current = inputs.step()
    if (next > current) {
      if (next >= 1 && !accountSkipped() && Object.keys(errorsFor(0)).length > 0) {
        showErrors.set(true)
        return
      }
      if (next >= 2 && Object.keys(errorsFor(1)).length > 0) {
        showErrors.set(true)
        if (current !== 1) inputs.onStep(1)
        return
      }
      if (next >= 3 && Object.keys(errorsFor(2)).length > 0) {
        showErrors.set(true)
        if (current !== 2) inputs.onStep(2)
        return
      }
      if (current === 3 && next === 4) {
        complete()
        return
      }
      showErrors.set(false)
    } else {
      showErrors.set(false)
    }
    inputs.onStep(next)
  }

  const complete = () => {
    if (saving.get() || createdOrgId.get() !== null) return
    if (!termsAccepted.get() || !dpaAccepted.get()) {
      showErrors.set(true)
      return
    }
    saving.set(true)
    try {
      const current = draft()
      const result = dashOnboardingComplete({
        account: accountSkipped() ? null : { name: current.accountName.trim(), email: current.accountEmail.trim() },
        org: {
          kind: current.kind,
          name: current.orgName.trim(),
          slug: current.slug.trim(),
          logoDataUrl: current.logoDataUrl,
        },
        imprint: {
          legalName: current.legalName,
          street: current.street,
          zip: current.zip,
          city: current.city,
          representative: current.representative,
          register: current.register,
          vatId: current.vatId,
        },
        tax: { status: current.taxStatus },
        bank: { holder: current.holder, iban: current.iban },
        termsAccepted: true,
        dpaAccepted: true,
      })
      if (!result.success) {
        const failure = result as { success: boolean; error?: { message?: unknown } }
        const message =
          typeof failure.error?.message === "string"
            ? failure.error.message
            : "Dein Onboarding ist gerade nicht möglich."
        toastAdd({ title: "Onboarding fehlgeschlagen", description: message, variant: "error" })
        return
      }
      createdOrgId.set(result.data.orgId)
      persistClear()
      showErrors.set(false)
      inputs.onStep(4)
    } finally {
      saving.set(false)
    }
  }

  const createdOrg = () =>
    createdOrgId.get() ? (dashStateGet().orgs.find((org) => org.id === createdOrgId.get()) ?? null) : null

  const slugCheck = () => {
    const value = slug.get().trim()
    const patternOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    const taken = value.length > 0 && takenSlugs().includes(value)
    return { value, patternOk, taken, available: value.length > 0 && patternOk && !taken }
  }

  const contractsReady = () => termsAccepted.get() && dpaAccepted.get()

  const canContinue = () => {
    if (inputs.step() === 0 && accountSkipped()) return true
    if (inputs.step() === 3) return contractsReady()
    return Object.keys(errors()).length === 0
  }

  const primaryLabel = () => (inputs.step() === 3 ? "Organisation anlegen" : "Weiter")

  const goBack = () => inputs.onStep(Math.max(0, inputs.step() - 1))

  const openDashboard = () => {
    if (createdOrgId.get() === null) complete()
    void navigate({ to: "/demo/dashboard" })
  }

  return {
    step: inputs.step,
    accountSkipped,
    sessionUser,
    accountName,
    accountEmail,
    accountPassword,
    showPassword,
    kind,
    orgName,
    slug,
    slugTouched,
    logoDataUrl,
    legalName,
    street,
    zip,
    city,
    representative,
    register,
    vatId,
    taxStatus,
    holder,
    iban,
    termsAccepted,
    dpaAccepted,
    showErrors,
    saving,
    createdOrgId,
    createdOrg,
    slugCheck,
    canContinue,
    contractsReady,
    primaryLabel,
    goBack,
    readSheet,
    draft,
    takenSlugs,
    errors,
    set,
    setOrgName,
    setSlug,
    formatIban,
    goStep,
    complete,
    openDashboard,
    persistDraft,
  }
}

export type DashOnboardingPageState = ReturnType<typeof dashOnboardingPageStateCreate>
