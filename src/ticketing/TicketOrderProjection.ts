export type TicketOrderProjection = {
  readonly id: string
  readonly checkoutKey: string
  readonly eventKey: string
  readonly eventTitle: string
  readonly eventSubtitle: string
  readonly eventDescription: string
  readonly eventStartsAt: string
  readonly eventEndsAt: string
  readonly eventDoorsAt: string
  readonly venue: string
  readonly city: string
  readonly address: string
  readonly organizer: string
  readonly imageUrl: string
  readonly imageAlt: string
  readonly catalogVersion: number
  readonly contact: {
    readonly email: string
    readonly givenName: string
    readonly familyName: string
    readonly phone: string
  }
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
  readonly paymentReference: string
  readonly billingOrderReference?: string
  readonly stripeMode: "live" | "test"
  readonly status:
    | "reserved"
    | "checkout_created"
    | "paid"
    | "failed"
    | "expired"
    | "released"
    | "paid_inventory_conflict"
  readonly paymentStatus: "pending" | "paid" | "failed" | "expired"
  readonly checkoutUrl?: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly lines: readonly {
    readonly tierKey: string
    readonly tierName: string
    readonly tierDescription: string
    readonly quantity: number
    readonly priceCents: number
    readonly feeCents: number
  }[]
  readonly tickets: readonly {
    readonly id: string
    readonly sequence: number
    readonly code: string
    readonly eventKey: string
    readonly eventTitle: string
    readonly eventStartsAt: string
    readonly eventDoorsAt: string
    readonly venue: string
    readonly city: string
    readonly address: string
    readonly tierKey: string
    readonly tierName: string
    readonly priceCents: number
    readonly feeCents: number
    readonly issuedAt: string
  }[]
}
