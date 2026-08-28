import type { TicketCheckoutSearch } from "./TicketCheckoutSearch.ts"

export function ticketCheckoutSearchParse(input: Record<string, unknown>): TicketCheckoutSearch {
  const rawEvent = input.event
  const rawTickets = input.tickets

  return {
    event: typeof rawEvent === "string" && rawEvent.length > 0 ? rawEvent : undefined,
    tickets: typeof rawTickets === "string" && rawTickets.length > 0 ? rawTickets : undefined,
  }
}
