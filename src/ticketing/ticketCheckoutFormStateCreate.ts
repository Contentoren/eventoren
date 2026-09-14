import { useNavigate } from "@tanstack/solid-router"
import { createMemo, onMount } from "solid-js"
import { userTokenGet } from "../auth/ui/signals/userSessionSignal.ts"
import type { EventItem } from "../events/EventItem.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"
import type { TicketContact } from "./TicketContact.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketCheckoutCreate } from "./ticketCheckoutCreate.ts"
import { ticketCheckoutKeyCreate } from "./ticketCheckoutKeyCreate.ts"
import { ticketCheckoutLegalDocumentRevision } from "./ticketCheckoutLegalDocumentRevision.ts"
import { ticketCheckoutStepLabels } from "./ticketCheckoutStepLabels.ts"
import { ticketCheckoutStepOrder } from "./ticketCheckoutStepOrder.ts"
import { ticketContactDraftLoad } from "./ticketContactDraftLoad.ts"
import { ticketContactDraftSave } from "./ticketContactDraftSave.ts"
import { ticketContactEmpty } from "./ticketContactEmpty.ts"
import { ticketContactValidate } from "./ticketContactValidate.ts"
import { ticketGuestAccessTokenCreate } from "./ticketGuestAccessTokenCreate.ts"
import { ticketOrderAccessStorageUpsert } from "./ticketOrderAccessStorageUpsert.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"
import { ticketCheckoutSearchOrderIds } from "./ticketCheckoutSearchOrderIds.ts"

type CheckoutItem = { readonly event: EventItem; readonly cart: TicketCart }

export function ticketCheckoutFormStateCreate(inputs: { items: () => readonly CheckoutItem[] }) {
  const navigate = useNavigate()
  const contact = createSignalObject<TicketContact>(ticketContactEmpty())
  const step = createSignalObject<TicketCheckoutStep>("kontakt")
  const errorMessage = createSignalObject("")
  const isSubmitting = createSignalObject(false)
  const legalAccepted = createSignalObject(false)

  const persistDraft = () => ticketContactDraftSave(contact.get())

  onMount(() => {
    const draft = ticketContactDraftLoad()
    if (draft.success) contact.set(draft.data)
  })

  const stepLabels = createMemo(() => ticketCheckoutStepOrder.map((entry) => ticketCheckoutStepLabels[entry]))
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

  const contactFieldChange = (field: keyof TicketContact, value: string) => {
    contact.set({ ...contact.get(), [field]: value })
    errorMessage.set("")
    persistDraft()
  }

  const legalAcceptanceChange = (accepted: boolean) => {
    legalAccepted.set(accepted)
    errorMessage.set("")
  }

  const goToPayment = () => {
    if (isCartEmpty()) {
      errorMessage.set("Bitte wähle zuerst mindestens ein Ticket aus.")
      return
    }
    const validated = ticketContactValidate(contact.get())
    if (!validated.success) {
      errorMessage.set(validated.errorMessage)
      return
    }
    contact.set(validated.data)
    errorMessage.set("")
    step.set("zahlung")
  }

  const goToContact = () => {
    errorMessage.set("")
    step.set("kontakt")
  }

  const confirmPayment = async () => {
    if (isSubmitting.get()) return
    if (isCartEmpty()) {
      errorMessage.set("Bitte wähle zuerst mindestens ein Ticket aus.")
      return
    }
    if (!legalAccepted.get()) {
      errorMessage.set("Bitte bestätige AGB und Datenschutzhinweise.")
      return
    }

    const validated = ticketContactValidate(contact.get())
    if (!validated.success) {
      errorMessage.set(validated.errorMessage)
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
            .map((line) => ({ tierKey: line.tierId, quantity: line.quantity })),
          successUrl: returnUrl.toString(),
          cancelUrl: returnUrl.toString(),
          locale: "de",
          customer: {
            email: validated.data.email,
            givenName: validated.data.firstName,
            familyName: validated.data.lastName,
            phone: validated.data.phone,
          },
          legalContext: {
            cta: "Jetzt kostenpflichtig buchen",
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
      errorMessage.set(error instanceof Error ? error.message : "Checkout konnte nicht erstellt werden.")
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
    legalAcceptanceChange,
    contactFieldChange,
    goToPayment,
    goToContact,
    confirmPayment,
  }
}
