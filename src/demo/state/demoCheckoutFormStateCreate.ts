import { createEffect, createMemo, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { EventItem } from "../../events/EventItem.ts"
import type { TicketCart } from "../../ticketing/TicketCart.ts"
import type { TicketCheckoutStep } from "../../ticketing/TicketCheckoutStep.ts"
import type { TicketContact } from "../../ticketing/TicketContact.ts"
import type { TicketOrderProjection } from "../../ticketing/TicketOrderProjection.ts"
import type { TicketParticipantNames } from "../../ticketing/TicketParticipantNames.ts"
import type { TicketRequiredFieldKey } from "../../ticketing/TicketRequiredFieldKey.ts"
import { ticketCartTotalCalculate } from "../../ticketing/ticketCartTotalCalculate.ts"
import { ticketCheckoutStepLabels } from "../../ticketing/ticketCheckoutStepLabels.ts"
import { ticketCheckoutStepOrder } from "../../ticketing/ticketCheckoutStepOrder.ts"
import { ticketCheckoutText } from "../../ticketing/ticketCheckoutText.ts"
import { ticketParticipantFieldKeyCreate } from "../../ticketing/ticketParticipantFieldKeyCreate.ts"
import { ticketParticipantNamesAlign } from "../../ticketing/ticketParticipantNamesAlign.ts"
import { ticketParticipantNamesValidate } from "../../ticketing/ticketParticipantNamesValidate.ts"
import { ticketPriceFormat } from "../../ticketing/ticketPriceFormat.ts"
import { demoText } from "../model/demoText.ts"
import { demoCartStore } from "./demoCartStore.ts"

import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

type DemoCheckoutItem = { readonly event: EventItem; readonly cart: TicketCart }

const demoContactRequiredFields = ["firstName", "lastName", "email", "address"] as const

function demoContactFieldInvalid(field: (typeof demoContactRequiredFields)[number], value: string) {
  if (field === "firstName" || field === "lastName") return value.trim().length < 2
  if (field === "address") return value.trim().length < 3
  return !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export function demoCheckoutFormStateCreate(inputs: {
  events: readonly EventItem[]
  empty?: boolean
  error?: boolean
  relaxedValidation?: boolean
  skipForm?: boolean
  flow?: DemoFlowContextValue
}) {
  const flow = inputs.flow ?? demoFlowContextUse()
  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isFlowError = () => (hasFlow() ? flow.isError() : Boolean(inputs.error))
  const isFlowEmpty = () => (hasFlow() ? flow.isEmpty() : Boolean(inputs.empty))

  const contact = createSignalObject<TicketContact>({
    firstName: "Alex",
    lastName: "Demo",
    email: "alex@example.test",
    address: "Musterstraße 1",
    phone: "",
  })
  const step = createSignalObject<TicketCheckoutStep>("kontakt")
  const errorMessage = createSignalObject(
    inputs.error ? "Die lokale Demo-Zahlung konnte nicht abgeschlossen werden." : "",
  )
  const isSubmitting = createSignalObject(false)
  const submitAttempted = createSignalObject(false)
  const invalidRequiredFields = createSignalObject<readonly TicketRequiredFieldKey[]>([])
  const legalAccepted = createSignalObject(false)
  const completedOrders = createSignalObject<readonly TicketOrderProjection[]>([])
  const items = createMemo<readonly DemoCheckoutItem[]>(() =>
    (isFlowEmpty() || isLoading() ? [] : demoCartStore.draft())
      .map((cart) => {
        const event = inputs.events.find((candidate) => candidate.id === cart.eventId)
        return event ? { event, cart } : undefined
      })
      .filter((item): item is DemoCheckoutItem => item !== undefined),
  )
  const participantNames = createSignalObject<TicketParticipantNames>(ticketParticipantNamesAlign({}, items()))
  const stepLabels = createMemo(() => ticketCheckoutStepOrder.map((entry) => ticketCheckoutStepLabels()[entry]))
  const stepIndex = createMemo(() => ticketCheckoutStepOrder.indexOf(step.get()))
  const total = createMemo(() => {
    let quantity = 0
    let subtotalCents = 0
    let feeCents = 0
    for (const item of items()) {
      const itemTotal = ticketCartTotalCalculate(item.cart, item.event)
      quantity += itemTotal.quantity
      subtotalCents += itemTotal.subtotalCents
      feeCents += itemTotal.feeCents
    }
    return { quantity, subtotalCents, feeCents, totalCents: subtotalCents + feeCents }
  })

  const contactFieldChange = (field: keyof TicketContact, value: string) => {
    contact.set({ ...contact.get(), [field]: value })
    const requiredField = field === "phone" ? undefined : field
    if (submitAttempted.get() && !inputs.relaxedValidation && requiredField) {
      const current = invalidRequiredFields.get().filter((key) => key !== requiredField)
      invalidRequiredFields.set(demoContactFieldInvalid(requiredField, value) ? [...current, requiredField] : current)
    }
    errorMessage.set("")
  }

  const legalAcceptanceChange = (accepted: boolean) => {
    legalAccepted.set(accepted)
    errorMessage.set("")
  }

  const participantFields = createMemo(() =>
    items().flatMap((item) =>
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
    on(items, (currentItems) => {
      participantNames.set(ticketParticipantNamesAlign(participantNames.get(), currentItems))
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

  const participantNameChange = (eventId: string, tierId: string, ticketIndex: number, value: string) => {
    const aligned = ticketParticipantNamesAlign(participantNames.get(), items())
    const lineNames = [...(aligned[eventId]?.[tierId] ?? [])]
    lineNames[ticketIndex] = value
    participantNames.set({ ...aligned, [eventId]: { ...aligned[eventId], [tierId]: lineNames } })
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
    if (total().quantity === 0) {
      errorMessage.set(demoText("checkoutEmptyCart"))
      return
    }
    if (!inputs.skipForm && !legalAccepted.get()) {
      errorMessage.set(demoText("checkoutLegalRequired"))
      return
    }
    submitAttempted.set(true)
    const invalidContactFields =
      inputs.skipForm || inputs.relaxedValidation
        ? []
        : demoContactRequiredFields.filter((field) => demoContactFieldInvalid(field, contact.get()[field]))
    const alignedParticipantNames = ticketParticipantNamesAlign(participantNames.get(), items())
    const invalidParticipantFields = inputs.skipForm
      ? []
      : items().flatMap((item) =>
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
    let validatedParticipantNames = ticketParticipantNamesAlign(participantNames.get(), items())
    if (!inputs.skipForm) {
      const participantValidation = ticketParticipantNamesValidate(
        participantNames.get(),
        items(),
        text.participantRequired,
      )
      if (!participantValidation.success) {
        errorMessage.set(participantValidation.errorMessage)
        return
      }
      validatedParticipantNames = participantValidation.data
    }
    if (inputs.error) {
      errorMessage.set("Die lokale Demo-Zahlung konnte nicht abgeschlossen werden.")
      return
    }

    isSubmitting.set(true)
    const now = new Date().toISOString()
    const orders = items().map((item, index): TicketOrderProjection => {
      const itemTotal = ticketCartTotalCalculate(item.cart, item.event)
      return {
        id: `demo-order-${index + 1}`,
        checkoutKey: "demo-checkout",
        eventKey: item.event.id,
        eventTitle: item.event.title,
        eventSubtitle: item.event.subtitle,
        eventDescription: item.event.description,
        eventStartsAt: item.event.startsAt,
        eventEndsAt: item.event.endsAt,
        eventDoorsAt: item.event.doorsAt,
        venue: item.event.venue,
        city: item.event.city,
        address: item.event.address,
        organizer: item.event.organizer,
        imageUrl: item.event.imageUrl,
        imageAlt: item.event.imageAlt,
        catalogVersion: item.event.catalogVersion,
        contact: {
          email: contact.get().email,
          givenName: contact.get().firstName,
          familyName: contact.get().lastName,
          phone: contact.get().phone,
        },
        subtotalCents: itemTotal.subtotalCents,
        feeCents: itemTotal.feeCents,
        totalCents: itemTotal.totalCents,
        paymentReference: "demo-local-payment",
        stripeMode: "test",
        status: "paid",
        paymentStatus: "paid",
        createdAt: now,
        updatedAt: now,
        lines: item.cart.lines.flatMap((line) => {
          const tier = item.event.tiers.find((candidate) => candidate.id === line.tierId)
          return tier
            ? [
                {
                  tierKey: tier.id,
                  tierName: tier.name,
                  tierDescription: tier.description,
                  quantity: line.quantity,
                  priceCents: tier.priceCents,
                  feeCents: tier.feeCents,
                },
              ]
            : []
        }),
        tickets: (() => {
          let sequence = 0
          return item.cart.lines.flatMap((line) => {
            const tier = item.event.tiers.find((candidate) => candidate.id === line.tierId)
            if (!tier) return []
            return Array.from({ length: line.quantity }, (_, ticketIndex) => {
              sequence += 1
              return {
                id: `demo-ticket-${index + 1}-${line.tierId}-${ticketIndex + 1}`,
                sequence,
                code: `DEMO-${item.event.id}-${sequence}`,
                eventKey: item.event.id,
                eventTitle: item.event.title,
                eventStartsAt: item.event.startsAt,
                eventDoorsAt: item.event.doorsAt,
                venue: item.event.venue,
                city: item.event.city,
                address: item.event.address,
                tierKey: tier.id,
                tierName: tier.name,
                priceCents: tier.priceCents,
                feeCents: tier.feeCents,
                participantName:
                  validatedParticipantNames[item.event.id]?.[line.tierId]?.[ticketIndex]?.trim() || undefined,
                issuedAt: now,
              }
            })
          })
        })(),
      }
    })
    completedOrders.set(orders)
    isSubmitting.set(false)
  }

  createEffect(() => {
    if (!inputs.skipForm || items().length === 0 || completedOrders.get().length > 0) return
    void confirmPayment()
  })

  return {
    items,
    contact: contact.get,
    step: step.get,
    stepIndex,
    stepLabels,
    errorMessage: () =>
      isFlowError() ? "Die lokale Demo-Zahlung konnte nicht abgeschlossen werden." : errorMessage.get(),
    isLoading,
    isSubmitting: isSubmitting.get,
    submitAttempted: submitAttempted.get,
    isCartEmpty: () => total().quantity === 0,
    totalLabel: () => ticketPriceFormat(total().totalCents),
    legalAccepted: legalAccepted.get,
    participantNames: participantNames.get,
    participantFields,
    isFieldInvalid: (key: TicketRequiredFieldKey) => invalidRequiredFields.get().includes(key),
    legalAcceptanceChange,
    contactFieldChange,
    participantNameChange,
    confirmPayment,
    completedOrders: completedOrders.get,
  }
}
