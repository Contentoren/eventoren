import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import type { DashAttendeeCheckinFilter, DashAttendeeKanalFilter } from "./dashAttendeeSearchParse.ts"

export interface DashAttendeeListFilterInput {
  tickets: DashTicket[]
  orders: DashOrder[]
  ticketTypeName: (ticketTypeId: string) => string
  q: string
  ticketart: string
  checkin: DashAttendeeCheckinFilter
  kanal: DashAttendeeKanalFilter
}

export interface DashAttendeeListRow {
  ticket: DashTicket
  order: DashOrder | null
  ticketTypeName: string
  checkinLabel: string
}

export interface DashAttendeeListResult {
  rows: DashAttendeeListRow[]
  counts: Record<DashAttendeeCheckinFilter, number>
  total: number
}

function attendeeBaseMatch(ticket: DashTicket, order: DashOrder | null, input: DashAttendeeListFilterInput): boolean {
  if (input.ticketart !== "" && ticket.ticketTypeId !== input.ticketart) return false
  if (input.kanal !== "alle" && order?.channel !== input.kanal) return false
  const query = input.q.trim().toLowerCase()
  if (query.length === 0) return true
  return (
    ticket.holderName.toLowerCase().includes(query) ||
    ticket.holderEmail.toLowerCase().includes(query) ||
    ticket.code.toLowerCase().includes(query)
  )
}

function attendeeCheckinMatch(ticket: DashTicket, filter: DashAttendeeCheckinFilter): boolean {
  if (filter === "alle") return true
  if (filter === "eingecheckt") return ticket.checkedInAt !== null
  return ticket.checkedInAt === null
}

/** Eine Zeile je Ticket des Events (alle Kanäle, storniert inklusive); Filter für Suche, Ticketart, Check-in und Kanal. */
export function dashAttendeeListFilter(input: DashAttendeeListFilterInput): DashAttendeeListResult {
  const orderById = new Map(input.orders.map((order) => [order.id, order] as const))
  const enriched: DashAttendeeListRow[] = input.tickets.map((ticket) => {
    const order = orderById.get(ticket.orderId) ?? null
    const checkedIn = ticket.checkedInAt !== null
    return {
      ticket,
      order,
      ticketTypeName: input.ticketTypeName(ticket.ticketTypeId),
      checkinLabel: checkedIn && ticket.checkedInAt ? ticket.checkedInAt : "",
    }
  })
  const base = enriched.filter((row) => attendeeBaseMatch(row.ticket, row.order, input))
  const countFor = (filter: DashAttendeeCheckinFilter): number =>
    base.filter((row) => attendeeCheckinMatch(row.ticket, filter)).length
  const counts: Record<DashAttendeeCheckinFilter, number> = {
    alle: base.length,
    eingecheckt: countFor("eingecheckt"),
    offen: countFor("offen"),
  }
  const rows = base
    .filter((row) => attendeeCheckinMatch(row.ticket, input.checkin))
    .sort((a, b) => a.ticket.holderName.localeCompare(b.ticket.holderName, "de", { sensitivity: "base" }))
  return { rows, counts, total: enriched.length }
}
