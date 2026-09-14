export function ticketCheckoutSearchOrderIds(orderIds: readonly string[]): string {
  return orderIds.join(",")
}
