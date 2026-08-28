import type { TicketSelectionSearch } from "./TicketSelectionSearch.ts"

export function ticketSelectionSearchParse(input: Record<string, unknown>): TicketSelectionSearch {
  const raw = input.tickets
  return { tickets: typeof raw === "string" && raw.length > 0 ? raw : undefined }
}
