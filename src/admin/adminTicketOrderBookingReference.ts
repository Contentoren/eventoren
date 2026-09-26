export function adminTicketOrderBookingReference(order: {
  readonly paymentStatus: string
  readonly bookingReference?: string | null
  readonly bookingNumber?: number | null
  readonly stripeMode: "live" | "test"
}): string | undefined {
  if (order.paymentStatus !== "paid") return undefined
  if (order.bookingReference) return order.bookingReference
  if (order.bookingNumber === undefined || order.bookingNumber === null) return undefined
  return `${order.stripeMode === "test" ? "TEST-" : ""}${String(order.bookingNumber).padStart(5, "0")}`
}
