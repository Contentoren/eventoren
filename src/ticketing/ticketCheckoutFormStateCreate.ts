import { useNavigate } from "@tanstack/solid-router"
import { type Accessor, createMemo, createSignal, onMount, type Setter } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"
import type { TicketContact } from "./TicketContact.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { ticketCartDraftSave } from "./ticketCartDraftSave.ts"
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

type SignalObject<T> = {
  get: Accessor<T>
  set: Setter<T>
}

const createSignalObject = <T>(initialValue: T): SignalObject<T> => {
  const [get, set] = createSignal(initialValue)
  return { get, set }
}

export function ticketCheckoutFormStateCreate(inputs: {
  items: () => readonly { readonly event: EventItem; readonly cart: TicketCart }[]
  onOrderComplete?: (orders: readonly TicketOrder[]) => void
}) {
  const navigate = useNavigate()
  const contact = createSignalObject<TicketContact>(ticketContactEmpty())
  const step = createSignalObject<TicketCheckoutStep>("kontakt")
  const errorMessage = createSignalObject("")
  const orders = createSignalObject<readonly TicketOrder[]>([])
  const isSubmitting = createSignalObject(false)
  const paymentMethod = createSignalObject<TicketPaymentMethod>(ticketPaymentMethodDefault)

  const persistDraft = ticketStorageIdleWrite(() => {
    if (orders.get().length > 0) return
    ticketContactDraftSave(contact.get())
  })

  const persistPaymentMethod = ticketStorageIdleWrite(() => {
    if (orders.get().length > 0) return
    ticketPaymentMethodDraftSave(paymentMethod.get())
  })

  onMount(() => {
    const draft = ticketContactDraftLoad()
    if (draft.success) contact.set(draft.data)

    const method = ticketPaymentMethodDraftLoad()
    if (method.success) paymentMethod.set(method.data)
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

  const paymentMethodOptions = createMemo(() => ticketPaymentMethodOptions)

  const selectedPaymentMethodOption = createMemo(() => ticketPaymentMethodOptionOf(paymentMethod.get()))

  const confirmLabel = createMemo(() => {
    if (paymentMethod.get() === "wallet") return "Mit Apple Pay / Google Pay zahlen"
    if (paymentMethod.get() === "paypal") return "Mit PayPal bezahlen"
    if (paymentMethod.get() === "klarna") return "Mit Klarna kostenpflichtig buchen"
    return "Jetzt kostenpflichtig buchen"
  })

  const paymentMethodSelect = (method: TicketPaymentMethod) => {
    paymentMethod.set(method)
    errorMessage.set("")
    persistPaymentMethod()
  }

  const contactFieldChange = (field: keyof TicketContact, value: string) => {
    contact.set({ ...contact.get(), [field]: value })
    errorMessage.set("")
    persistDraft()
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

  const confirmPayment = () => {
    if (isSubmitting.get()) return
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
    isSubmitting.set(true)
    const createdOrders: TicketOrder[] = []
    for (const item of inputs.items()) {
      const created = ticketOrderCreate({
        event: item.event,
        cart: item.cart,
        contact: contact.get(),
        paymentMethod: paymentMethod.get(),
      })
      if (!created.success) {
        errorMessage.set(created.errorMessage)
        isSubmitting.set(false)
        return
      }
      createdOrders.push(created.data)
    }

    for (const order of createdOrders) {
      const stored = ticketStorageAppend(order)
      if (!stored.success) {
        errorMessage.set(stored.errorMessage)
        isSubmitting.set(false)
        return
      }
    }

    ticketCartDraftSave([])
    ticketContactDraftSave(null)
    ticketPaymentMethodDraftSave(null)
    orders.set(createdOrders)
    errorMessage.set("")
    step.set("bestaetigung")
    isSubmitting.set(false)
    inputs.onOrderComplete?.(createdOrders)
    navigate({
      to: "/",
      search: { buchung: "erfolgreich" },
    })
  }

  return {
    contact: contact.get,
    step: step.get,
    stepIndex,
    stepLabels,
    errorMessage: errorMessage.get,
    orders: orders.get,
    isSubmitting: isSubmitting.get,
    isCartEmpty,
    totalLabel,
    paymentMethod: paymentMethod.get,
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
