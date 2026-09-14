export type TicketPaymentReconcileResponse = {
  readonly orderId: string
  readonly status:
    | "reserved"
    | "checkout_created"
    | "paid"
    | "failed"
    | "expired"
    | "released"
    | "paid_inventory_conflict"
  readonly paymentStatus: "pending" | "paid" | "failed" | "expired"
  readonly ticketCount: number
}
