import { useNavigate, useRouter } from "@tanstack/solid-router"
import { createEffect, createMemo, on, onCleanup, onMount } from "solid-js"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { eventorenAuthContextUse } from "../auth/ui/eventorenAuthContextUse.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketCheckoutCreateInput } from "./TicketCheckoutCreateInput.ts"
import type { TicketCheckoutFormState } from "./TicketCheckoutFormState.ts"
import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"
import type { TicketContact } from "./TicketContact.ts"
import type { TicketParticipantNames } from "./TicketParticipantNames.ts"
import type { TicketRequiredFieldKey } from "./TicketRequiredFieldKey.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
import { ticketActivationCodeMissing } from "./ticketActivationCodeMissing.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketCheckoutCreate } from "./ticketCheckoutCreate.ts"
import { ticketCheckoutKeyCreate } from "./ticketCheckoutKeyCreate.ts"
import { ticketCheckoutLegalDocumentRevision } from "./ticketCheckoutLegalDocumentRevision.ts"
import { ticketCheckoutLegalDocumentSnapshot } from "./ticketCheckoutLegalDocumentSnapshot.ts"
import { ticketCheckoutTicketsCreate } from "./ticketCheckoutTicketsCreate.ts"
import { ticketCheckoutReturnUrlCreate } from "./ticketCheckoutReturnUrlCreate.ts"
import { ticketCheckoutSearchOrderIds } from "./ticketCheckoutSearchOrderIds.ts"
import { ticketCheckoutStepLabels } from "./ticketCheckoutStepLabels.ts"
import { ticketCheckoutStepOrder } from "./ticketCheckoutStepOrder.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"
import { ticketContactDraftLoad } from "./ticketContactDraftLoad.ts"
import { ticketContactDraftSave } from "./ticketContactDraftSave.ts"
import { ticketContactEmpty } from "./ticketContactEmpty.ts"
import { ticketContactValidate } from "./ticketContactValidate.ts"
import { ticketGuestAccessTokenCreate } from "./ticketGuestAccessTokenCreate.ts"
import { ticketingServerRead } from "./ticketingServerRead.ts"
import { ticketOrderAccessStorageUpsert } from "./ticketOrderAccessStorageUpsert.ts"
import { ticketParticipantFieldKeyCreate } from "./ticketParticipantFieldKeyCreate.ts"
import { ticketParticipantNamesAlign } from "./ticketParticipantNamesAlign.ts"
import { ticketParticipantNamesValidate } from "./ticketParticipantNamesValidate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

type CheckoutItem = { readonly event: EventItem; readonly cart: TicketCart }

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

const ticketContactRequiredFields = [
  "firstName",
  "lastName",
  "email",
  "address",
  "postalCode",
  "city",
  "country",
] as const

function ticketContactFieldInvalid(field: (typeof ticketContactRequiredFields)[number], value: string) {
  if (field === "firstName" || field === "lastName") return value.trim().length < 2
  if (field === "address") return value.trim().length < 3
  if (field === "postalCode" || field === "city") return value.trim().length === 0
  if (field === "country") return !/^[A-Z]{2}$/.test(value.trim().toUpperCase())
  return !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export function ticketCheckoutFormStateCreate(inputs: {
  items: () => readonly CheckoutItem[]
  appOrigin: () => Result<string>
}): TicketCheckoutFormState {
  const navigate = useNavigate()
  const router = useRouter()
  const auth = eventorenAuthContextUse()
  const contact = createSignalObject<TicketContact>(ticketContactEmpty())
  const step = createSignalObject<TicketCheckoutStep>("kontakt")
  const errorMessage = createSignalObject("")
  const isSubmitting = createSignalObject(false)
  const hydrated = createSignalObject(false)
  const submitAttempted = createSignalObject(false)
  const invalidRequiredFields = createSignalObject<readonly TicketRequiredFieldKey[]>([])
  const termsAccepted = createSignalObject(false)
  const privacyAcknowledged = createSignalObject(false)
  const participantNames = createSignalObject<TicketParticipantNames>(ticketParticipantNamesAlign({}, inputs.items()))

  let debounceTimer: number | undefined
  let cancelIdleSave: (() => void) | undefined
  let saveGeneration = 0
  let draftChanged = false

  const cancelScheduledSave = () => {
    saveGeneration += 1
    if (typeof window === "undefined") return
    if (debounceTimer !== undefined) {
      window.clearTimeout(debounceTimer)
      debounceTimer = undefined
    }
    cancelIdleSave?.()
    cancelIdleSave = undefined
  }

  const draftSnapshot = () => ({
    contact: contact.get(),
    participantNames: ticketParticipantNamesAlign(participantNames.get(), inputs.items()),
    documentSetRevision: ticketCheckoutLegalDocumentRevision,
    termsAccepted: termsAccepted.get(),
    privacyAcknowledged: privacyAcknowledged.get(),
  })

  const persistDraft = (immediate = false) => {
    if (typeof window === "undefined") return
    if (!hydrated.get() && !draftChanged) return
    cancelScheduledSave()
    const snapshot = draftSnapshot()
    if (immediate) {
      ticketContactDraftSave(snapshot)
      return
    }
    const generation = saveGeneration
    debounceTimer = window.setTimeout(() => {
      if (generation !== saveGeneration) return
      debounceTimer = undefined
      const idleWindow = window as WindowWithIdleCallback
      const save = () => {
        if (generation !== saveGeneration) return
        cancelIdleSave = undefined
        ticketContactDraftSave(snapshot)
      }
      if (typeof idleWindow.requestIdleCallback === "function") {
        const idleId = idleWindow.requestIdleCallback(save, { timeout: 1000 })
        cancelIdleSave = () => idleWindow.cancelIdleCallback?.(idleId)
        return
      }
      const fallbackTimer = window.setTimeout(save, 0)
      cancelIdleSave = () => window.clearTimeout(fallbackTimer)
    }, 250)
  }

  onCleanup(() => {
    if (typeof window !== "undefined") window.removeEventListener("pagehide", flushDraft)
    if (hydrated.get()) flushDraft()
  })

  const flushDraft = () => {
    if (typeof window === "undefined") return
    cancelScheduledSave()
    ticketContactDraftSave(draftSnapshot())
  }

  onMount(() => {
    const draft = ticketContactDraftLoad()
    if (draft.success) {
      contact.set(draft.data.contact)
      participantNames.set(ticketParticipantNamesAlign(draft.data.participantNames, inputs.items()))
      termsAccepted.set(draft.data.termsAccepted)
      privacyAcknowledged.set(draft.data.privacyAcknowledged)
    }
    hydrated.set(true)
    window.addEventListener("pagehide", flushDraft)
  })

  const stepLabels = createMemo(() => ticketCheckoutStepOrder.map((entry) => ticketCheckoutStepLabels()[entry]))
  const stepIndex = createMemo(() => ticketCheckoutStepOrder.indexOf(step.get()))
  const total = createMemo(() => {
    let quantity = 0
    let subtotalCents = 0
    let feeCents = 0

    for (const item of inputs.items()) {
      const itemTotal = ticketCartTotalCalculate(item.cart, item.event)
      quantity += itemTotal.quantity
      subtotalCents += itemTotal.subtotalCents
      feeCents += itemTotal.feeCents
    }

    return { quantity, subtotalCents, feeCents, totalCents: subtotalCents + feeCents }
  })
  const totalLabel = createMemo(() => ticketPriceFormat(total().totalCents))
  const isCartEmpty = createMemo(() => total().quantity === 0 || inputs.items().length === 0)
  const participantFields = createMemo(() =>
    inputs.items().flatMap((item) =>
      item.cart.lines.flatMap((line) => {
        if (line.quantity <= 0) return []
        const tierName = item.event.tiers.find((tier) => tier.id === line.tierId)?.name ?? line.tierId
        const totalForTier = line.quantity
        return Array.from({ length: line.quantity }, (_, ticketIndex) => ({
          eventId: item.event.id,
          eventTitle: item.event.title,
          tierId: line.tierId,
          tierName,
          ticketIndex,
          totalForTier,
          get value() {
            return participantNames.get()[item.event.id]?.[line.tierId]?.[ticketIndex] ?? ""
          },
        }))
      }),
    ),
  )

  createEffect(
    on(inputs.items, (items) => {
      participantNames.set(ticketParticipantNamesAlign(participantNames.get(), items))
      persistDraft()
      if (!submitAttempted.get()) return
      const activeParticipantFields = participantFields().map((field) =>
        ticketParticipantFieldKeyCreate(field.eventId, field.tierId, field.ticketIndex),
      )
      invalidRequiredFields.set(
        invalidRequiredFields
          .get()
          .filter((key) => !key.startsWith("participant:") || activeParticipantFields.includes(key)),
      )
    }),
  )

  const contactFieldChange = (field: keyof TicketContact, value: string) => {
    draftChanged = true
    const nextValue = field === "country" ? value.toUpperCase().replace(/[^A-Z]/g, "") : value
    contact.set({ ...contact.get(), [field]: nextValue })
    if (
      submitAttempted.get() &&
      ticketContactRequiredFields.includes(field as (typeof ticketContactRequiredFields)[number])
    ) {
      const invalid = ticketContactFieldInvalid(field as (typeof ticketContactRequiredFields)[number], nextValue)
      const current = invalidRequiredFields.get().filter((key) => key !== field)
      invalidRequiredFields.set(invalid ? [...current, field as TicketRequiredFieldKey] : current)
    }
    if (field === "billingKind" || field === "companyName") {
      const current = invalidRequiredFields.get().filter((key) => key !== "companyName")
      if (submitAttempted.get() && contact.get().billingKind === "company" && !contact.get().companyName.trim())
        invalidRequiredFields.set([...current, "companyName"])
      else invalidRequiredFields.set(current)
    }
    if (field === "taxId") {
      const current = invalidRequiredFields.get().filter((key) => key !== "taxId")
      const taxId = nextValue.trim().toUpperCase()
      const invalid =
        taxId.length > 0 &&
        (!/^[A-Z]{2}[A-Z0-9]{2,14}$/.test(taxId) || (taxId.startsWith("DE") && !/^DE[0-9]{9}$/.test(taxId)))
      invalidRequiredFields.set(submitAttempted.get() && invalid ? [...current, "taxId"] : current)
    }
    errorMessage.set("")
    persistDraft()
  }

  const termsAcceptanceChange = (accepted: boolean) => {
    draftChanged = true
    termsAccepted.set(accepted)
    errorMessage.set("")
    persistDraft()
  }

  const privacyAcknowledgementChange = (accepted: boolean) => {
    draftChanged = true
    privacyAcknowledged.set(accepted)
    errorMessage.set("")
    persistDraft()
  }

  const participantNameChange = (eventId: string, tierId: string, ticketIndex: number, value: string) => {
    draftChanged = true
    const aligned = ticketParticipantNamesAlign(participantNames.get(), inputs.items())
    const lineNames = [...(aligned[eventId]?.[tierId] ?? [])]
    lineNames[ticketIndex] = value
    participantNames.set({
      ...aligned,
      [eventId]: { ...aligned[eventId], [tierId]: lineNames },
    })
    if (submitAttempted.get()) {
      const key = ticketParticipantFieldKeyCreate(eventId, tierId, ticketIndex)
      const current = invalidRequiredFields.get().filter((fieldKey) => fieldKey !== key)
      invalidRequiredFields.set(value.trim().length === 0 ? [...current, key] : current)
    }
    errorMessage.set("")
    persistDraft()
  }

  const confirmPayment = async () => {
    const text = ticketCheckoutText()
    if (isSubmitting.get()) return
    if (hydrated.get() || draftChanged) flushDraft()
    if (isCartEmpty()) {
      errorMessage.set(text.emptyCart)
      return
    }
    const missingCode = inputs
      .items()
      .flatMap((item) =>
        ticketActivationCodeMissing(item.event, item.cart).map((missing) => ({
          ...missing,
          eventTitle: item.event.title,
        })),
      )[0]
    if (missingCode) {
      errorMessage.set(
        `Für „${missingCode.tierName}" ist ein Freischaltungscode erforderlich. Bitte kehre zu „${missingCode.eventTitle}" zurück und trage den Code ein.`,
      )
      return
    }
    if (!termsAccepted.get() || !privacyAcknowledged.get()) {
      errorMessage.set(text.legalRequired)
      return
    }

    submitAttempted.set(true)
    const invalidContactFields: TicketRequiredFieldKey[] = ticketContactRequiredFields.filter((field) =>
      ticketContactFieldInvalid(field, contact.get()[field]),
    )
    if (contact.get().billingKind === "company" && !contact.get().companyName.trim())
      invalidContactFields.push("companyName")
    const taxId = contact.get().taxId.trim().toUpperCase()
    if (
      contact.get().billingKind === "company" &&
      taxId &&
      (!/^[A-Z]{2}[A-Z0-9]{2,14}$/.test(taxId) || (taxId.startsWith("DE") && !/^DE[0-9]{9}$/.test(taxId)))
    )
      invalidContactFields.push("taxId")
    const alignedParticipantNames = ticketParticipantNamesAlign(participantNames.get(), inputs.items())
    const invalidParticipantFields = inputs.items().flatMap((item) =>
      item.cart.lines.flatMap((line) => {
        if (line.quantity <= 0) return []
        const names = alignedParticipantNames[item.event.id]?.[line.tierId] ?? []
        return Array.from({ length: line.quantity }, (_, ticketIndex) =>
          names[ticketIndex]?.trim().length
            ? []
            : [ticketParticipantFieldKeyCreate(item.event.id, line.tierId, ticketIndex)],
        ).flat()
      }),
    )
    const invalidFields: readonly TicketRequiredFieldKey[] = [...invalidContactFields, ...invalidParticipantFields]
    invalidRequiredFields.set(invalidFields)
    if (invalidFields.length > 0) {
      errorMessage.set(text.requiredFields)
      return
    }

    const validated = ticketContactValidate(contact.get())
    if (!validated.success) {
      errorMessage.set(validated.errorMessage)
      return
    }

    const validatedParticipantNames = ticketParticipantNamesValidate(
      participantNames.get(),
      inputs.items(),
      text.participantRequired,
    )
    if (!validatedParticipantNames.success) {
      errorMessage.set(validatedParticipantNames.errorMessage)
      return
    }

    const appOrigin = inputs.appOrigin()
    if (!appOrigin.success) {
      errorMessage.set(appOrigin.errorMessage)
      return
    }

    if (!auth.ready()) await auth.refresh()
    isSubmitting.set(true)
    const submittedItems = inputs.items()
    try {
      await router.invalidate()
    } catch {
      errorMessage.set(text.catalogUnavailable)
      isSubmitting.set(false)
      return
    }
    const refreshedItems = inputs.items()
    if (
      refreshedItems.length !== submittedItems.length ||
      submittedItems.some(
        (item, index) =>
          JSON.stringify({ ...item.event, catalogVersion: 0 }) !==
            JSON.stringify({ ...refreshedItems[index]?.event, catalogVersion: 0 }) ||
          JSON.stringify(item.cart.lines) !== JSON.stringify(refreshedItems[index]?.cart.lines),
      )
    ) {
      errorMessage.set(text.catalogChanged)
      isSubmitting.set(false)
      return
    }

    const authenticated = Boolean(auth.identity())
    const guestAccessToken = authenticated ? undefined : ticketGuestAccessTokenCreate()
    const createdOrderIds: string[] = []
    let redirectUrl: string | undefined
    errorMessage.set("")

    try {
      for (const item of inputs.items()) {
        const checkoutKey = ticketCheckoutKeyCreate()
        const returnUrl = ticketCheckoutReturnUrlCreate(appOrigin.data, checkoutKey)
        if (!returnUrl.success) {
          errorMessage.set(returnUrl.errorMessage)
          isSubmitting.set(false)
          return
        }
        const checkoutInput: Omit<TicketCheckoutCreateInput, "token" | "guestAccessToken"> = {
          checkoutKey,
          eventKey: item.event.id,
          catalogVersion: item.event.catalogVersion,
          eventRevision: item.event.eventRevision ?? 1,
          tickets: ticketCheckoutTicketsCreate(item.cart, validatedParticipantNames.data),
          successUrl: returnUrl.data,
          cancelUrl: returnUrl.data,
          locale: "de",
          customer: {
            email: validated.data.email,
            givenName: validated.data.firstName,
            familyName: validated.data.lastName,
            address: validated.data.address,
            phone: validated.data.phone,
            billingDetails: {
              givenName: validated.data.firstName,
              familyName: validated.data.lastName,
              ...(validated.data.billingKind === "company"
                ? {
                    company: validated.data.companyName,
                    ...(validated.data.companyExtra ? { companyExtra: validated.data.companyExtra } : {}),
                  }
                : {}),
              address: {
                line1: validated.data.address,
                ...(validated.data.addressLine2 ? { line2: validated.data.addressLine2 } : {}),
                postalCode: validated.data.postalCode,
                city: validated.data.city,
                country: validated.data.country,
              },
              ...(validated.data.billingKind === "company" && validated.data.taxId
                ? { taxId: { type: "eu_vat" as const, value: validated.data.taxId } }
                : {}),
            },
          },
          legalContext: {
            cta: text.legalCta,
            termsAccepted: true,
            privacyAcknowledged: true,
            documentSetRevision: ticketCheckoutLegalDocumentRevision,
            termsMarkdown: ticketCheckoutLegalDocumentSnapshot.termsMarkdown,
            privacyMarkdown: ticketCheckoutLegalDocumentSnapshot.privacyMarkdown,
          },
        }
        const created = authenticated
          ? await (await ticketingServerRead()).checkoutCreate({ data: checkoutInput })
          : await ticketCheckoutCreate({ ...checkoutInput, guestAccessToken })
        if (!created.success) {
          if (
            created.errorMessage === "The event revision is stale" ||
            created.errorMessage === "The event revision is required"
          ) {
            await router.invalidate()
            errorMessage.set(ticketCheckoutText().catalogChanged)
          } else {
            errorMessage.set(created.errorMessage)
          }
          isSubmitting.set(false)
          return
        }

        const stored = ticketOrderAccessStorageUpsert({
          orderId: created.data.orderId,
          checkoutKey,
          guestAccessToken,
        })
        if (!stored.success) {
          errorMessage.set(stored.errorMessage)
          isSubmitting.set(false)
          return
        }

        createdOrderIds.push(created.data.orderId)
        if (created.data.url && redirectUrl === undefined) redirectUrl = created.data.url
      }
    } catch (error) {
      errorMessage.set(error instanceof Error ? error.message : text.checkoutFailed)
      isSubmitting.set(false)
      return
    }

    ticketCartDraftSave([])
    isSubmitting.set(false)
    if (redirectUrl) {
      window.location.assign(redirectUrl)
      return
    }
    navigate({
      to: "/checkout",
      search: { orders: ticketCheckoutSearchOrderIds(createdOrderIds) },
    })
  }

  return {
    hydrated: hydrated.get,
    contact: contact.get,
    step: step.get,
    stepIndex,
    stepLabels,
    errorMessage: errorMessage.get,
    isSubmitting: isSubmitting.get,
    submitAttempted: submitAttempted.get,
    isCartEmpty,
    totalLabel,
    termsAccepted: termsAccepted.get,
    privacyAcknowledged: privacyAcknowledged.get,
    participantNames: participantNames.get,
    participantFields,
    isFieldInvalid: (key) => invalidRequiredFields.get().includes(key),
    termsAcceptanceChange,
    privacyAcknowledgementChange,
    contactFieldChange,
    participantNameChange,
    confirmPayment,
  }
}
