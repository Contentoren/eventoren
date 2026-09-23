import type { EventorenTicketPaymentDetailsResponse } from "billing/contracts/eventorenTicketPaymentDetailsResponseSchema"

export type AdminTicketOrderDetails = {
  readonly id: string
  readonly customerEmail: string
  readonly customerGivenName: string | null
  readonly customerFamilyName: string | null
  readonly customerAddress: string | null
  readonly customerPhone: string | null
  readonly eventKey: string
  readonly eventTitle: string
  readonly eventSubtitle: string
  readonly eventStartsAt: string
  readonly eventEndsAt: string
  readonly eventDoorsAt: string
  readonly venue: string
  readonly city: string
  readonly eventAddress: string
  readonly organizer: string
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
  readonly paymentReference: string
  readonly billingOrderReference: string | null
  readonly stripeMode: "live" | "test"
  readonly orderStatus: string
  readonly paymentStatus: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly lines: readonly {
    readonly tierName: string
    readonly quantity: number
    readonly priceCents: number
    readonly feeCents: number
  }[]
  readonly stripeDetails: EventorenTicketPaymentDetailsResponse["data"] | null
  readonly stripeError: string | null
}
