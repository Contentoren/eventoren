import { useNavigate } from "@tanstack/solid-router"
import { createEffect, createMemo, on, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { language } from "../app/i18n/language.ts"
import { languageSignal } from "../app/i18n/languageSignal.ts"
import { userTokenGet } from "../auth/ui/signals/userSessionSignal.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketCheckoutFormState } from "./TicketCheckoutFormState.ts"
import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"
import type { TicketContact } from "./TicketContact.ts"
import type { TicketParticipantNames } from "./TicketParticipantNames.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketCheckoutCreate } from "./ticketCheckoutCreate.ts"
import { ticketCheckoutKeyCreate } from "./ticketCheckoutKeyCreate.ts"
import { ticketCheckoutLegalDocumentRevision } from "./ticketCheckoutLegalDocumentRevision.ts"
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
import { ticketParticipantNamesAlign } from "./ticketParticipantNamesAlign.ts"
import { ticketParticipantNamesValidate } from "./ticketParticipantNamesValidate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

type CheckoutItem = { readonly event: EventItem; readonly cart: TicketCart }

export function ticketCheckoutFormStateCreate(inputs: {
  items: () => readonly CheckoutItem[]
}): TicketCheckoutFormState {
  const navigate = useNavigate()
  const contact = createSignalObject<TicketContact>(ticketContactEmpty())
  const step = createSignalObject<TicketCheckoutStep>("kontakt")
  const errorMessage = createSignalObject("")
  const isSubmitting = createSignalObject(false)
  const legalAccepted = createSignalObject(false)
  const participantNames = createSignalObject<TicketParticipantNames>(ticketParticipantNamesAlign({}, inputs.items()))

  const persistDraft = () => ticketContactDraftSave(contact.get())

  onMount(() => {
    const draft = ticketContactDraftLoad()
    if (draft.success) contact.set(draft.data)
  })

  createEffect(
    on(inputs.items, (items) => {
      participantNames.set(ticketParticipantNamesAlign(participantNames.get(), items))
    }),
  )

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

  const contactFieldChange = (field: keyof TicketContact, value: string) => {
    contact.set({ ...contact.get(), [field]: value })
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

    const validated = ticketContactValidate(contact.get(), text.locale)
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

    const token = userTokenGet()
    const guestAccessToken = token ? undefined : ticketGuestAccessTokenCreate()
    const createdOrderIds: string[] = []
    let redirectUrl: string | undefined
    isSubmitting.set(true)
    errorMessage.set("")

    try {
      for (const item of inputs.items()) {
        const checkoutKey = ticketCheckoutKeyCreate()
        const returnUrl = new URL("/checkout", window.location.origin)
        returnUrl.searchParams.set("checkout", checkoutKey)
        const created = await ticketCheckoutCreate({
          token: token || undefined,
          guestAccessToken,
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
          successUrl: returnUrl.toString(),
          cancelUrl: returnUrl.toString(),
          locale: languageSignal.get() === language.de ? "de" : "en",
          customer: {
            email: validated.data.email,
            givenName: validated.data.firstName,
            familyName: validated.data.lastName,
            phone: validated.data.phone,
          },
          legalContext: {
            cta: text.legalCta,
            termsAccepted: true,
            privacyAcknowledged: true,
            documentSetRevision: ticketCheckoutLegalDocumentRevision,
          },
        })
        if (!created.success) {
          errorMessage.set(created.errorMessage)
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
    contact: contact.get,
    step: step.get,
    stepIndex,
    stepLabels,
    errorMessage: errorMessage.get,
    isSubmitting: isSubmitting.get,
    isCartEmpty,
    totalLabel,
    legalAccepted: legalAccepted.get,
    participantNames: participantNames.get,
    participantFields,
    legalAcceptanceChange,
    contactFieldChange,
    participantNameChange,
    confirmPayment,
  }
}
