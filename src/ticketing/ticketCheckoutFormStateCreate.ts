import { useNavigate, useRouter } from "@tanstack/solid-router"
import { createEffect, createMemo, on, onMount } from "solid-js"
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
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketCheckoutCreate } from "./ticketCheckoutCreate.ts"
import { ticketCheckoutKeyCreate } from "./ticketCheckoutKeyCreate.ts"
import { ticketCheckoutLegalDocumentRevision } from "./ticketCheckoutLegalDocumentRevision.ts"
import { ticketCheckoutLegalDocumentSnapshot } from "./ticketCheckoutLegalDocumentSnapshot.ts"
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
import { ticketOrderAccessStorageUpsert } from "./ticketOrderAccessStorageUpsert.ts"
import { ticketParticipantFieldKeyCreate } from "./ticketParticipantFieldKeyCreate.ts"
import { ticketParticipantNamesAlign } from "./ticketParticipantNamesAlign.ts"
import { ticketParticipantNamesValidate } from "./ticketParticipantNamesValidate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"
import { ticketingServerRead } from "./ticketingServerRead.ts"

type CheckoutItem = { readonly event: EventItem; readonly cart: TicketCart }

const ticketContactRequiredFields = ["firstName", "lastName", "email", "address"] as const

function ticketContactFieldInvalid(field: (typeof ticketContactRequiredFields)[number], value: string) {
  if (field === "firstName" || field === "lastName") return value.trim().length < 2
  if (field === "address") return value.trim().length < 3
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
  const legalAccepted = createSignalObject(false)
  const participantNames = createSignalObject<TicketParticipantNames>(ticketParticipantNamesAlign({}, inputs.items()))

  const persistDraft = () => ticketContactDraftSave(contact.get())

  onMount(() => {
    const draft = ticketContactDraftLoad()
    if (draft.success) contact.set(draft.data)
    hydrated.set(true)
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
        return Array.from({ length: line.quantity }, (_, ticketIndex) => ({
          eventId: item.event.id,
          eventTitle: item.event.title,
          tierId: line.tierId,
          tierName,
          ticketIndex,
          value: participantNames.get()[item.event.id]?.[line.tierId]?.[ticketIndex] ?? "",
        }))
      }),
    ),
  )

  createEffect(
    on(inputs.items, (items) => {
      participantNames.set(ticketParticipantNamesAlign(participantNames.get(), items))
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
    contact.set({ ...contact.get(), [field]: value })
    if (submitAttempted.get() && field !== "phone") {
      const invalid = ticketContactFieldInvalid(field, value)
      const current = invalidRequiredFields.get().filter((key) => key !== field)
      invalidRequiredFields.set(invalid ? [...current, field] : current)
    }
    errorMessage.set("")
    persistDraft()
  }

  const legalAcceptanceChange = (accepted: boolean) => {
    legalAccepted.set(accepted)
    errorMessage.set("")
  }

  const participantNameChange = (eventId: string, tierId: string, ticketIndex: number, value: string) => {
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
  }

  const confirmPayment = async () => {
    const text = ticketCheckoutText()
    if (isSubmitting.get()) return
    if (isCartEmpty()) {
      errorMessage.set(text.emptyCart)
      return
    }
    if (!legalAccepted.get()) {
      errorMessage.set(text.legalRequired)
      return
    }

    submitAttempted.set(true)
    const invalidContactFields = ticketContactRequiredFields.filter((field) =>
      ticketContactFieldInvalid(field, contact.get()[field]),
    )
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
          tickets: item.cart.lines
            .filter((line) => line.quantity > 0)
            .map((line) => ({
              tierKey: line.tierId,
              quantity: line.quantity,
              participantNames: [...(validatedParticipantNames.data[item.event.id]?.[line.tierId] ?? [])],
            })),
          successUrl: returnUrl.data,
          cancelUrl: returnUrl.data,
          locale: "de",
          customer: {
            email: validated.data.email,
            givenName: validated.data.firstName,
            familyName: validated.data.lastName,
            address: validated.data.address,
            phone: validated.data.phone,
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
          if (created.errorMessage === "The catalog version is stale") {
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
    ticketContactDraftSave(null)
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
    legalAccepted: legalAccepted.get,
    participantNames: participantNames.get,
    participantFields,
    isFieldInvalid: (key) => invalidRequiredFields.get().includes(key),
    legalAcceptanceChange,
    contactFieldChange,
    participantNameChange,
    confirmPayment,
  }
}
