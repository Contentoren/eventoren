import type { EventItem } from "../events/EventItem.ts"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCart } from "./TicketCart.ts"
import type { TicketContact } from "./TicketContact.ts"
import type { TicketOrder } from "./TicketOrder.ts"
import type { TicketOrderLine } from "./TicketOrderLine.ts"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketContactValidate } from "./ticketContactValidate.ts"
import { ticketOrderCodeCreate } from "./ticketOrderCodeCreate.ts"
import { ticketPaymentMethodParse } from "./ticketPaymentMethodParse.ts"

const op = "ticketOrderCreate"

export function ticketOrderCreate(input: {
  event: EventItem
  cart: TicketCart
  contact: TicketContact
  paymentMethod: TicketPaymentMethod
  now?: Date
}): Result<TicketOrder> {
  if (input.cart.eventId !== input.event.id)
    return createResultError(op, "Warenkorb gehört nicht zu diesem Event.", input.cart)

  const contact = ticketContactValidate(input.contact)
  if (!contact.success) return contact

  const paymentMethod = ticketPaymentMethodParse(input.paymentMethod)
  if (!paymentMethod.success) return paymentMethod

  const lines: TicketOrderLine[] = []
  for (const line of input.cart.lines) {
    if (line.quantity <= 0) continue
    const tier = input.event.tiers.find((candidate) => candidate.id === line.tierId)
    if (!tier) return createResultError(op, "Unbekannte Ticketkategorie im Warenkorb.", line)
    if (line.quantity > tier.available)
      return createResultError(op, `Für ${tier.name} sind nur noch ${tier.available} Tickets verfügbar.`, line)
    lines.push({
      tierId: tier.id,
      tierName: tier.name,
      quantity: line.quantity,
      priceCents: tier.priceCents,
      feeCents: tier.feeCents,
    })
  }

  if (lines.length === 0) return createResultError(op, "Bitte wähle mindestens ein Ticket aus.", input.cart)

  const createdAt = (input.now ?? new Date()).toISOString()
  const code = ticketOrderCodeCreate()

  return createResult({
    id: code.toLowerCase(),
    code,
    createdAt,
    eventId: input.event.id,
    eventTitle: input.event.title,
    eventStartsAt: input.event.startsAt,
    eventDoorsAt: input.event.doorsAt,
    venue: input.event.venue,
    city: input.event.city,
    address: input.event.address,
    imageUrl: input.event.imageUrl,
    contact: contact.data,
    paymentMethod: paymentMethod.data,
    lines,
    total: ticketCartTotalCalculate(input.cart, input.event),
  })
}
