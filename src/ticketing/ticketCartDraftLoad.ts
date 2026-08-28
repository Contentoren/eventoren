import type { TicketCart } from "./TicketCart.ts"
import { ticketCartDraftKey } from "./ticketCartDraftKey.ts"
import { ticketCartEmpty } from "./ticketCartEmpty.ts"
import { ticketCartSearchParse } from "./ticketCartSearchParse.ts"

export function ticketCartDraftLoad(): TicketCart {
  if (typeof localStorage === "undefined") return ticketCartEmpty("")

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketCartDraftKey)
  } catch {
    return ticketCartEmpty("")
  }
  if (raw === null) return ticketCartEmpty("")

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return ticketCartEmpty("")
  }
  if (typeof parsed !== "object" || parsed === null) return ticketCartEmpty("")

  const candidate = parsed as { eventId?: unknown; tickets?: unknown }
  if (typeof candidate.eventId !== "string" || candidate.eventId.length === 0) return ticketCartEmpty("")
  if (typeof candidate.tickets !== "string") return ticketCartEmpty(candidate.eventId)

  return ticketCartSearchParse(candidate.eventId, candidate.tickets)
}
