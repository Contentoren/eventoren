import { organizerContractDocuments } from "../../../contracts/organizerContractDocuments.ts"
import { api } from "#convex/_generated/api.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import {
  veranstalterOnboardingInputValidate,
  type VeranstalterOnboardingTechnicalData,
} from "./veranstalterOnboardingInputValidate.ts"

export function veranstalterOnboardingPageStateCreate() {
  const createOrganization = mutationCreate(api.organizerDashboard.organizerDashboardOrganizationCreateMutation)
  const name = createSignalObject("")
  const slug = createSignalObject("")
  const kind = createSignalObject("verein")
  const contactEmail = createSignalObject("")
  const contactPhone = createSignalObject("")
  const imprint = createSignalObject("")
  const iban = createSignalObject("")
  const bankHolder = createSignalObject("")
  const termsAccepted = createSignalObject(false)
  const dpaAccepted = createSignalObject(false)
  const serverError = createSignalObject<string | null>(null)
  const submitting = createSignalObject(false)
  const createdSlug = createSignalObject<string | null>(null)
  const createdOrganizationId = createSignalObject<string | null>(null)

  const validation = () =>
    veranstalterOnboardingInputValidate({
      name: name.get(),
      slug: slug.get(),
      kind: kind.get(),
      contactEmail: contactEmail.get(),
      contactPhone: contactPhone.get(),
      imprint: imprint.get(),
      iban: iban.get(),
      bankHolder: bankHolder.get(),
    })
  const technicalData = (): VeranstalterOnboardingTechnicalData | null => {
    const result = validation()
    return result.success ? result.data : null
  }
  const blockerMessage = (): string | null => {
    if (!termsAccepted.get() || !dpaAccepted.get()) {
      return "Bitte beide Vertragsmuster lesen und ausdrücklich zustimmen."
    }
    return null
  }
  const validationError = (): string | null => {
    const result = validation()
    return result.success ? null : result.errorMessage
  }
  const canSubmit = (): boolean => validation().success && termsAccepted.get() && dpaAccepted.get() && !submitting.get()

  const submit = async (): Promise<void> => {
    const validated = validation()
    if (!validated.success) {
      serverError.set(validated.errorMessage)
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
      })
      if (!result.success) {
        serverError.set(result.errorMessage)
        return
      }
      createdOrganizationId.set(result.data.orgId)
      createdSlug.set(data.slug)
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
    termsAccepted,
    dpaAccepted,
    serverError,
    submitting,
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
