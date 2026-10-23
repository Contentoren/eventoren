import { createEffect, useContext } from "solid-js"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import type { VeranstalterOnboardingDraft } from "./veranstalterOnboardingDraftSchema.ts"
import { organizerContractDocuments } from "../../../contracts/organizerContractDocuments.ts"
import { api } from "#convex/_generated/api.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import {
  veranstalterOnboardingInputValidate,
  type VeranstalterOnboardingTechnicalData,
} from "./veranstalterOnboardingInputValidate.ts"
import type { VeranstalterOnboardingDraftCache } from "./veranstalterOnboardingDraftCacheCreate.ts"
import { veranstalterOnboardingDraftCacheCreate } from "./veranstalterOnboardingDraftCacheCreate.ts"

export function veranstalterOnboardingPageStateCreate(inputs?: {
  readonly cache?: VeranstalterOnboardingDraftCache | undefined
}) {
  const auth = useContext(eventorenAuthContext)
  const createOrganization = mutationCreate(api.organizerDashboard.organizerDashboardOrganizationCreateMutation)
  const cache = inputs?.cache ?? veranstalterOnboardingDraftCacheCreate(undefined, auth.identity()?.userId)
  const cached = cache.load()
  const name = createSignalObject(cached?.name ?? "")
  const slug = createSignalObject(cached?.slug ?? "")
  const kind = createSignalObject<VeranstalterOnboardingDraft["kind"]>(cached?.kind ?? "verein")
  const contactEmail = createSignalObject(cached?.contactEmail ?? auth.identity()?.email ?? "")
  const contactPhone = createSignalObject(cached?.contactPhone ?? "")
  const imprint = createSignalObject(cached?.imprint ?? "")
  const iban = createSignalObject(cached?.iban ?? "")
  const bankHolder = createSignalObject(cached?.bankHolder ?? "")
  const legalName = createSignalObject(cached?.contractParty.legalName ?? "")
  const representativeName = createSignalObject(cached?.contractParty.representativeName ?? auth.identity()?.name ?? "")
  const streetAddress = createSignalObject(cached?.contractParty.streetAddress ?? "")
  const postalCode = createSignalObject(cached?.contractParty.postalCode ?? "")
  const city = createSignalObject(cached?.contractParty.city ?? "")
  const countryCode = createSignalObject(cached?.contractParty.countryCode ?? "DE")
  const customerType = createSignalObject<"business" | "consumer">(cached?.contractParty.customerType ?? "business")
  const feePayer = createSignalObject<"kaeufer" | "veranstalter">(cached?.feePayer ?? "kaeufer")
  const authorityConfirmed = createSignalObject(false)
  const earlyServiceStartRequested = createSignalObject(false)
  const termsAccepted = createSignalObject(false)
  const dpaAccepted = createSignalObject(false)
  const serverError = createSignalObject<string | null>(null)
  const submitting = createSignalObject(false)
  const submissionAttempted = createSignalObject(false)
  const createdSlug = createSignalObject<string | null>(null)
  const createdOrganizationId = createSignalObject<string | null>(null)

  // Unsent technical fields survive reloads and unmounts via the validated
  // idle draft cache. Consent booleans stay memory-only and must be
  // reaffirmed; the cache is cleared on successful submission.
  const draftSnapshot = () => ({
    name: name.get(),
    slug: slug.get(),
    kind: kind.get(),
    contactEmail: contactEmail.get(),
    contactPhone: contactPhone.get(),
    imprint: imprint.get(),
    iban: iban.get(),
    bankHolder: bankHolder.get(),
    contractParty: {
      legalName: legalName.get(),
      representativeName: representativeName.get(),
      streetAddress: streetAddress.get(),
      postalCode: postalCode.get(),
      city: city.get(),
      countryCode: countryCode.get(),
      email: contactEmail.get(),
      customerType: customerType.get(),
    },
    feePayer: feePayer.get(),
  })
  createEffect(() => {
    if (createdOrganizationId.get() === null) cache.scheduleSave(draftSnapshot())
  })

  createEffect(() => {
    // Editing the agreement clears consent; no acceptance is restored from a browser draft.
    draftSnapshot()
    termsAccepted.set(false)
    dpaAccepted.set(false)
    authorityConfirmed.set(false)
    earlyServiceStartRequested.set(false)
  })

  const validation = () => veranstalterOnboardingInputValidate(draftSnapshot())
  const technicalData = (): VeranstalterOnboardingTechnicalData | null => {
    const result = validation()
    return result.success ? result.data : null
  }
  const blockerMessage = (): string | null => {
    if (!termsAccepted.get() || !dpaAccepted.get()) {
      return "Bitte dem Veranstaltervertrag einschließlich Preisblatt und der AVV ausdrücklich zustimmen."
    }
    if (!authorityConfirmed.get()) return "Bitte deine Berechtigung zum Vertragsabschluss bestätigen."
    return null
  }
  const validationError = (): string | null => {
    if (!submissionAttempted.get()) return null
    const result = validation()
    return result.success ? null : result.errorMessage
  }
  const canSubmit = (): boolean => !submitting.get() && createdOrganizationId.get() === null

  const submit = async (): Promise<void> => {
    if (!canSubmit()) return
    submissionAttempted.set(true)
    serverError.set(null)
    const validated = validation()
    if (!validated.success) {
      return
    }
    const blocked = blockerMessage()
    if (blocked !== null) {
      serverError.set(blocked)
      return
    }
    submitting.set(true)
    serverError.set(null)
    try {
      const data = validated.data
      const result = await createOrganization({
        name: data.name,
        slug: data.slug,
        kind: data.kind,
        ...(data.contact?.email !== undefined ? { contactEmail: data.contact.email } : {}),
        ...(data.contact?.phone !== undefined ? { contactPhone: data.contact.phone } : {}),
        ...(data.imprint !== undefined ? { imprint: data.imprint } : {}),
        ...(data.bank !== undefined ? { iban: data.bank.iban, bankHolder: data.bank.holder } : {}),
        termsAccepted: termsAccepted.get(),
        dpaAccepted: dpaAccepted.get(),
        termsRevision: organizerContractDocuments.terms.revision,
        dpaRevision: organizerContractDocuments.dpa.revision,
        contractParty: data.contractParty,
        feePayer: data.feePayer,
        authorityConfirmed: authorityConfirmed.get(),
        earlyServiceStartRequested: customerType.get() === "consumer" && earlyServiceStartRequested.get(),
      })
      if (!result.success) {
        serverError.set(result.errorMessage)
        return
      }
      createdOrganizationId.set(result.data.orgId)
      createdSlug.set(data.slug)
      cache.clear()
    } finally {
      submitting.set(false)
    }
  }

  const successSearch = (): { readonly org: string } | undefined => {
    const organizationId = createdOrganizationId.get()
    if (organizationId === null) return undefined
    return { org: organizationId }
  }

  return {
    name,
    slug,
    kind,
    contactEmail,
    contactPhone,
    imprint,
    iban,
    bankHolder,
    legalName,
    representativeName,
    streetAddress,
    postalCode,
    city,
    countryCode,
    customerType,
    feePayer,
    authorityConfirmed,
    earlyServiceStartRequested,
    termsAccepted,
    dpaAccepted,
    serverError,
    submitting,
    submissionAttempted,
    createdSlug,
    createdOrganizationId,
    successSearch,
    validation,
    validationError,
    technicalData,
    blockerMessage,
    canSubmit,
    submit,
  }
}

export type VeranstalterOnboardingPageState = ReturnType<typeof veranstalterOnboardingPageStateCreate>
