import { useNavigate } from "@tanstack/solid-router"
import { createMemo, createSignal, onMount } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"
import type { TicketContact } from "./TicketContact.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
import { ticketCartEmpty } from "./ticketCartEmpty.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketCheckoutStepLabels } from "./ticketCheckoutStepLabels.ts"
import { ticketCheckoutStepOrder } from "./ticketCheckoutStepOrder.ts"
import { ticketContactDraftLoad } from "./ticketContactDraftLoad.ts"
import { ticketContactDraftSave } from "./ticketContactDraftSave.ts"
import { ticketContactEmpty } from "./ticketContactEmpty.ts"
import { ticketContactValidate } from "./ticketContactValidate.ts"
import { ticketOrderCreate } from "./ticketOrderCreate.ts"
import { ticketPaymentMethodDefault } from "./ticketPaymentMethodDefault.ts"
import { ticketPaymentMethodDraftLoad } from "./ticketPaymentMethodDraftLoad.ts"
import { ticketPaymentMethodDraftSave } from "./ticketPaymentMethodDraftSave.ts"
import { ticketPaymentMethodOptionOf } from "./ticketPaymentMethodOptionOf.ts"
import { ticketPaymentMethodOptions } from "./ticketPaymentMethodOptions.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"
import { ticketStorageAppend } from "./ticketStorageAppend.ts"
import { ticketStorageIdleWrite } from "./ticketStorageIdleWrite.ts"

export function ticketCheckoutFormStateCreate(inputs: {
  event: () => EventItem
  cart: () => TicketCart
  onOrderComplete?: (order: TicketOrder) => void
}) {
  const navigate = useNavigate()
  const [contact, setContact] = createSignal<TicketContact>(ticketContactEmpty())
  const [step, setStep] = createSignal<TicketCheckoutStep>("kontakt")
  const [errorMessage, setErrorMessage] = createSignal("")
  const [order, setOrder] = createSignal<TicketOrder | null>(null)
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [paymentMethod, setPaymentMethod] = createSignal<TicketPaymentMethod>(ticketPaymentMethodDefault)

  const persistDraft = ticketStorageIdleWrite(() => {
    if (order() !== null) return
    ticketContactDraftSave(contact())
  })

  const persistPaymentMethod = ticketStorageIdleWrite(() => {
    if (order() !== null) return
    ticketPaymentMethodDraftSave(paymentMethod())
  })

  onMount(() => {
    const draft = ticketContactDraftLoad()
    if (draft.success) setContact(draft.data)

    const method = ticketPaymentMethodDraftLoad()
    if (method.success) setPaymentMethod(method.data)
  })

  const stepLabels = createMemo(() => ticketCheckoutStepOrder.map((entry) => ticketCheckoutStepLabels[entry]))
  const stepIndex = createMemo(() => ticketCheckoutStepOrder.indexOf(step()))
  const total = createMemo(() => ticketCartTotalCalculate(inputs.cart(), inputs.event()))
  const totalLabel = createMemo(() => ticketPriceFormat(total().totalCents))
  const isCartEmpty = createMemo(() => total().quantity === 0)

  const paymentMethodOptions = createMemo(() => ticketPaymentMethodOptions)

  const selectedPaymentMethodOption = createMemo(() => ticketPaymentMethodOptionOf(paymentMethod()))

  const confirmLabel = createMemo(() => {
    if (paymentMethod() === "wallet") return "Mit Apple Pay / Google Pay zahlen"
    if (paymentMethod() === "paypal") return "Mit PayPal bezahlen"
    if (paymentMethod() === "klarna") return "Mit Klarna kostenpflichtig buchen"
    return "Jetzt kostenpflichtig buchen"
  })

  const paymentMethodSelect = (method: TicketPaymentMethod) => {
    setPaymentMethod(method)
    setErrorMessage("")
    persistPaymentMethod()
  }

  const contactFieldChange = (field: keyof TicketContact, value: string) => {
    setContact({ ...contact(), [field]: value })
    setErrorMessage("")
    persistDraft()
  }

  const goToPayment = () => {
    if (isCartEmpty()) {
      setErrorMessage("Bitte wähle zuerst mindestens ein Ticket aus.")
      return
    }
    const validated = ticketContactValidate(contact())
    if (!validated.success) {
      setErrorMessage(validated.errorMessage)
      return
    }
    setContact(validated.data)
    setErrorMessage("")
    setStep("zahlung")
  }

  const goToContact = () => {
    setErrorMessage("")
    setStep("kontakt")
  }

  const confirmPayment = () => {
    if (isSubmitting()) return
    setIsSubmitting(true)

    const created = ticketOrderCreate({
      event: inputs.event(),
      cart: inputs.cart(),
      contact: contact(),
      paymentMethod: paymentMethod(),
    })
    if (!created.success) {
      setErrorMessage(created.errorMessage)
      setIsSubmitting(false)
      return
    }

    const stored = ticketStorageAppend(created.data)
    if (!stored.success) {
      setErrorMessage(stored.errorMessage)
      setIsSubmitting(false)
      return
    }

    ticketCartDraftSave(ticketCartEmpty(""))
    ticketContactDraftSave(null)
    ticketPaymentMethodDraftSave(null)
    setOrder(created.data)
    setErrorMessage("")
    setStep("bestaetigung")
    setIsSubmitting(false)
    inputs.onOrderComplete?.(created.data)
    navigate({
      to: "/",
      search: { buchung: "erfolgreich" },
    })
  }

  return {
    contact,
    step,
    stepIndex,
    stepLabels,
    errorMessage,
    order,
    isSubmitting,
    isCartEmpty,
    totalLabel,
    paymentMethod,
    paymentMethodOptions,
    selectedPaymentMethodOption,
    paymentMethodSelect,
    confirmLabel,
    contactFieldChange,
    goToPayment,
    goToContact,
    confirmPayment,
  }
}
