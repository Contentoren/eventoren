import { createRenderEffect } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { organizerContractDocuments } from "../../../contracts/organizerContractDocuments.ts"
import { veranstalterEinstellungenInputValidate } from "./veranstalterEinstellungenInputValidate.ts"

/**
 * Settings state for one owned organisation. Profile/bank edits go through
 * the real owner update mutation; fee/tax are read-only (no owner mutation
 * exists); bank editing additionally requires bank.bearbeiten, otherwise the
 * stored bank (when visible) is shown read-only. Server errors surface verbatim.
 */
export function veranstalterEinstellungenPageStateCreate(inputs: {
  readonly orgId: () => string | undefined
  readonly permissions: () => readonly string[]
}) {
  const profileResult = queryCreate(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery, () =>
    inputs.orgId() ? { orgId: inputs.orgId() as Id<"orgs"> } : undefined,
  )
  const updateOrganization = mutationCreate(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation)
  const acceptContracts = mutationCreate(api.organizerDashboard.organizerContractsAcceptMutation)
  const termsAccepted = createSignalObject(false)
  const dpaAccepted = createSignalObject(false)
  const contractsSubmitting = createSignalObject(false)
  const name = createSignalObject("")
  const kind = createSignalObject("verein")
  const contactEmail = createSignalObject("")
  const contactPhone = createSignalObject("")
  const imprint = createSignalObject("")
  const iban = createSignalObject("")
  const bankHolder = createSignalObject("")
  const serverError = createSignalObject<string | null>(null)
  const submitting = createSignalObject(false)
  const saved = createSignalObject(false)
  let activeOrganizationId: string | undefined
  let prefilledOrganizationId: string | undefined
  let scopeGeneration = 0
  let bankPrefilled = false

  const canEditProfile = () => inputs.permissions().includes("profil.bearbeiten")
  const canEditBank = () => inputs.permissions().includes("bank.bearbeiten")
  const storedProfile = () => {
    const orgId = inputs.orgId()
    const current = profileResult()
    if (orgId === undefined || !current || !current.success || current.data.orgId !== orgId) return null
    return current.data
  }
  const canReadBank = () => canEditBank() || inputs.permissions().includes("finanzen.sehen")
  const canViewBank = () => canReadBank() && storedProfile()?.bank != null
  const profileError = (): string | null => {
    const current = profileResult()
    if (!current || current.success) return null
    return current.errorMessage
  }
  const validationError = (): string | null => {
    const result = validation()
    return result.success ? null : result.errorMessage
  }

  createRenderEffect(() => {
    const orgId = inputs.orgId()
    const data = storedProfile()
    // Reset and prefill share an effect so a newly selected organization can
    // never inherit the previous organization's editable values or consent.
    if (orgId !== activeOrganizationId) {
      activeOrganizationId = orgId
      scopeGeneration++
      // Pending belongs to the selected scope, not requests from a previous visit.
      submitting.set(false)
      contractsSubmitting.set(false)
      prefilledOrganizationId = undefined
      bankPrefilled = false
      name.set("")
      kind.set("verein")
      contactEmail.set("")
      contactPhone.set("")
      imprint.set("")
      iban.set("")
      bankHolder.set("")
      saved.set(false)
      serverError.set(null)
      termsAccepted.set(false)
      dpaAccepted.set(false)
    }
    // Authoritative redaction (or lost visibility permission) overrides dirty
    // preservation. Never keep sensitive drafts visible after a role change.
    // A continuously absent bank is not a fresh redaction: preserve an editor's
    // first bank draft across ordinary null-bank profile refreshes.
    if (!canReadBank() || (data?.bank === null && bankPrefilled)) {
      iban.set("")
      bankHolder.set("")
      bankPrefilled = false
    } else if (data?.bank && !bankPrefilled) {
      iban.set(data.bank.iban ?? "")
      bankHolder.set(data.bank.holder ?? "")
      bankPrefilled = true
    }
    if (!data || prefilledOrganizationId === orgId) return
    prefilledOrganizationId = orgId
    name.set(data.profile.name)
    kind.set(data.profile.kind)
    contactEmail.set(data.profile.contact?.email ?? "")
    contactPhone.set(data.profile.contact?.phone ?? "")
    imprint.set(data.profile.imprint ?? "")
  })

  const validation = () =>
    veranstalterEinstellungenInputValidate({
      orgId: inputs.orgId() ?? "",
      name: name.get(),
      kind: kind.get(),
      contactEmail: contactEmail.get(),
      contactPhone: contactPhone.get(),
      imprint: imprint.get(),
      iban: iban.get(),
      bankHolder: bankHolder.get(),
      includeBank: canEditBank() && (iban.get().trim() !== "" || bankHolder.get().trim() !== ""),
    })
  const blockerMessage = (): string | null => {
    if (!canEditProfile() && !canEditBank()) {
      return "Deine Rolle erlaubt keine Profil- oder Bankänderungen. Wende dich an eine inhaber- oder admin-Rolle."
    }
    return null
  }
  const canSubmit = (): boolean =>
    blockerMessage() === null && validation().success && !submitting.get() && storedProfile() !== null

  const submit = async (): Promise<void> => {
    if (submitting.get()) return
    const generation = scopeGeneration
    const targetOrgId = inputs.orgId()
    if (targetOrgId === undefined || storedProfile() === null) {
      serverError.set("Die ausgewählte Organisation ist noch nicht geladen. Bitte warte auf die aktuellen Daten.")
      return
    }
    const blocked = blockerMessage()
    if (blocked !== null) {
      serverError.set(blocked)
      return
    }
    const validated = validation()
    if (!validated.success) {
      serverError.set(validated.errorMessage)
      return
    }
    submitting.set(true)
    serverError.set(null)
    saved.set(false)
    try {
      const data = validated.data
      const result = await updateOrganization({
        orgId: targetOrgId as Id<"orgs">,
        ...(canEditProfile() && data.profile !== undefined
          ? {
              ...(data.profile.name !== undefined ? { name: data.profile.name } : {}),
              ...(data.profile.kind !== undefined ? { kind: data.profile.kind } : {}),
              ...(data.profile.contact?.email !== undefined ? { contactEmail: data.profile.contact.email } : {}),
              ...(data.profile.contact?.phone !== undefined ? { contactPhone: data.profile.contact.phone } : {}),
              ...(data.profile.imprint !== undefined ? { imprint: data.profile.imprint } : {}),
            }
          : {}),
        ...(data.bank !== undefined
          ? {
              ...(data.bank.iban !== undefined ? { iban: data.bank.iban } : {}),
              ...(data.bank.holder !== undefined ? { bankHolder: data.bank.holder } : {}),
            }
          : {}),
      })
      if (scopeGeneration !== generation) return
      if (!result.success) {
        serverError.set(result.errorMessage)
        return
      }
      saved.set(true)
    } finally {
      if (scopeGeneration === generation) submitting.set(false)
    }
  }

  const contractDateLabel = (value: string | undefined) => {
    if (!value) return "Keine revisionierte Zustimmung erfasst"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Ungültiger Zeitstempel"
    const label = new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(date)
    return `${label} (Europe/Berlin)`
  }
  const submitContracts = async () => {
    const generation = scopeGeneration
    const targetOrgId = inputs.orgId()
    const data = storedProfile()
    if (targetOrgId === undefined || data === null) {
      serverError.set("Die ausgewählte Organisation ist noch nicht geladen. Bitte warte auf die aktuellen Daten.")
      return
    }
    if (!data.canAcceptContracts || !termsAccepted.get() || !dpaAccepted.get() || contractsSubmitting.get()) return
    contractsSubmitting.set(true)
    serverError.set(null)
    try {
      const result = await acceptContracts({
        orgId: targetOrgId as Id<"orgs">,
        termsAccepted: termsAccepted.get(),
        dpaAccepted: dpaAccepted.get(),
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
      })
      if (scopeGeneration !== generation) return
      if (!result.success) {
        serverError.set(result.errorMessage)
        return
      }
      termsAccepted.set(false)
      dpaAccepted.set(false)
    } finally {
      if (scopeGeneration === generation) contractsSubmitting.set(false)
    }
  }

  return {
    termsAccepted,
    dpaAccepted,
    contractsSubmitting,
    submitContracts,
    contractDateLabel,
    profileResult,
    storedProfile,
    profileError,
    validationError,
    name,
    kind,
    contactEmail,
    contactPhone,
    imprint,
    iban,
    bankHolder,
    serverError,
    submitting,
    saved,
    canEditProfile,
    canEditBank,
    canViewBank,
    validation,
    blockerMessage,
    canSubmit,
    submit,
  }
}

export type VeranstalterEinstellungenPageState = ReturnType<typeof veranstalterEinstellungenPageStateCreate>
