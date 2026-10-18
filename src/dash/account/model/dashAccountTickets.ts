import type { DashEvent } from "../../model/dashEventSchema.ts"
import type { DashTicket } from "../../model/dashTicketSchema.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"

export function dashAccountTickets(input: {
  tickets: readonly DashTicket[]
  events: readonly DashEvent[]
  ticketTypes: readonly DashTicketType[]
  email: string
  nowIso: string
}): {
  upcoming: { ticket: DashTicket; event: DashEvent | null; ticketTypeName: string }[]
  past: { ticket: DashTicket; event: DashEvent | null; ticketTypeName: string }[]
} {
  const wanted = input.email.trim().toLowerCase()
  const nowMs = Date.parse(input.nowIso)
  const eventById = new Map(input.events.map((event) => [event.id, event] as const))
  const typeNameById = new Map(input.ticketTypes.map((type) => [type.id, type.name] as const))
  const upcoming: { ticket: DashTicket; event: DashEvent | null; ticketTypeName: string }[] = []
  const past: { ticket: DashTicket; event: DashEvent | null; ticketTypeName: string }[] = []
  for (const ticket of input.tickets) {
    if (ticket.holderEmail.trim().toLowerCase() !== wanted) continue
    const event = eventById.get(ticket.eventId) ?? null
    const row = {
      ticket,
      event,
      ticketTypeName: typeNameById.get(ticket.ticketTypeId) ?? "Ticket",
    }
    const ended = event === null || Number.isNaN(Date.parse(event.endsAt)) || Date.parse(event.endsAt) <= nowMs
    const cancelled = ticket.status === "storniert" || event?.status === "abgesagt"
    if (ended || cancelled) {
      past.push(row)
    } else {
      upcoming.push(row)
    }
  }
  const byStartAsc = (
    a: { event: DashEvent | null; ticket: DashTicket },
    b: { event: DashEvent | null; ticket: DashTicket },
  ): number => {
    const aMs = a.event ? Date.parse(a.event.startsAt) : Number.POSITIVE_INFINITY
    const bMs = b.event ? Date.parse(b.event.startsAt) : Number.POSITIVE_INFINITY
    if (aMs !== bMs) return aMs - bMs
    return a.ticket.id.localeCompare(b.ticket.id)
  }
  upcoming.sort(byStartAsc)
  past.sort((a, b) => -byStartAsc(a, b))
  return { upcoming, past }
}
