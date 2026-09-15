export type TicketOrderSummary = {
  readonly id: string
  readonly checkoutKey: string
  readonly eventKey: string
  readonly eventTitle: string
  readonly eventSubtitle: string
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
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
  readonly status:
    | "reserved"
    | "checkout_created"
    | "paid"
    | "failed"
    | "expired"
    | "released"
    | "paid_inventory_conflict"
  readonly paymentStatus: "pending" | "paid" | "failed" | "expired"
  readonly createdAt: string
  readonly updatedAt: string
}
