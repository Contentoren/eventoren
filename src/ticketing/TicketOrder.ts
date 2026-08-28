import type { TicketCartTotal } from "./TicketCartTotal.ts"
import type { TicketContact } from "./TicketContact.ts"
import type { TicketOrderLine } from "./TicketOrderLine.ts"
import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"

export type TicketOrder = {
  id: string
  code: string
  createdAt: string
  eventId: string
  eventTitle: string
  eventStartsAt: string
  eventDoorsAt: string
  venue: string
  city: string
  address: string
  imageUrl: string
  contact: TicketContact
  paymentMethod: TicketPaymentMethod
  lines: readonly TicketOrderLine[]
  total: TicketCartTotal
}
