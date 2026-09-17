export type TicketCheckoutCreateResponse = {
  readonly orderId: string
  readonly paymentReference: string
  readonly orderReference?: string
  readonly stripeMode: "live" | "test"
  readonly status: "checkout_created" | "paid"
  readonly paymentStatus: "pending" | "paid"
  readonly url?: string
  readonly fulfillmentEligible: boolean
  readonly replayed: boolean
}
