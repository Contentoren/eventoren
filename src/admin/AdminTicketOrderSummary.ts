export type AdminTicketOrderSummary = {
  readonly id: string
  readonly customerEmail: string
  readonly customerFamilyName?: string
  readonly customerGivenName?: string
  readonly eventStartsAt: string
  readonly eventTitle: string
  readonly paymentReference: string
  readonly paymentStatus: "pending" | "paid" | "failed" | "expired"
  readonly status:
    | "reserved"
    | "checkout_created"
    | "paid"
    | "failed"
    | "expired"
    | "released"
    | "paid_inventory_conflict"
  readonly stripeMode: "live" | "test"
  readonly totalCents: number
  readonly createdAt: string
  readonly updatedAt: string
}
