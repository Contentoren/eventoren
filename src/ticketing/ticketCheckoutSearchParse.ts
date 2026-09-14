import type { TicketCheckoutSearch } from "./TicketCheckoutSearch.ts"

export function ticketCheckoutSearchParse(input: Record<string, unknown>): TicketCheckoutSearch {
  const rawEvent = input.event
  const rawTickets = input.tickets
  const rawOrders = input.orders
  const rawCheckout = input.checkout

  return {
    event: typeof rawEvent === "string" && rawEvent.length > 0 ? rawEvent : undefined,
    tickets: typeof rawTickets === "string" && rawTickets.length > 0 ? rawTickets : undefined,
    orders: typeof rawOrders === "string" && rawOrders.length > 0 ? rawOrders : undefined,
    checkout: typeof rawCheckout === "string" && rawCheckout.length > 0 ? rawCheckout : undefined,
  }
}
