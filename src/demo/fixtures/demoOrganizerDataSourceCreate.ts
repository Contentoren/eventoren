import type { PaginationOptions } from "convex/server"
import type { OrganizerDataResult } from "../../organizer/OrganizerDataResult.ts"
import type { OrganizerDataSource } from "../../organizer/OrganizerDataSource.ts"
import type { OrganizerTicket } from "../../organizer/OrganizerTicket.ts"
import type { OrganizerTicketListPage } from "../../organizer/OrganizerTicketListPage.ts"
import { demoOrganizerEvents } from "./demoOrganizerEvents.ts"
import { demoOrganizerTickets } from "./demoOrganizerTickets.ts"

export function demoOrganizerDataSourceCreate(inputs?: { readonly emptyEvents?: boolean }): OrganizerDataSource {
  let tickets = demoOrganizerTickets.map((ticket) => ({ ...ticket, checkIn: { ...ticket.checkIn } }))

  const ticketFind = (ticketId: OrganizerTicket["id"]) => tickets.find((ticket) => ticket.id === ticketId)
  const error = <T>(errorCode: string): OrganizerDataResult<T> => ({
    success: false,
    errorCode,
    errorMessage: errorCode,
  })
  const ticketCheckInApply = (
    eventKey: string,
    ticket: OrganizerTicket | undefined,
  ): OrganizerDataResult<OrganizerTicket> => {
    if (!ticket) return error("organizer.check-in.unknown-ticket")
    if (ticket.eventKey !== eventKey) return error("organizer.check-in.wrong-event")
    if (ticket.cancelled) return error("organizer.check-in.cancelled")
    if (ticket.paymentStatus !== "paid" || ticket.orderStatus !== "paid") {
      return error("organizer.check-in.unpaid")
    }
    if (ticket.checkedIn) {
      const previousCheckedInAt = ticket.checkedInAt ?? new Date().toISOString()
      return {
        success: false,
        errorCode: "organizer.check-in.duplicate",
        errorMessage: "organizer.check-in.duplicate",
        errorData: JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          previousCheckedInAt,
          previousOperator: ticket.checkedInByName ?? "Mara Demo",
          participantName: ticket.participantName,
          buyerName: ticket.buyerName,
          buyerEmail: ticket.buyerEmail,
          elapsedMilliseconds: Math.max(0, Date.now() - Date.parse(previousCheckedInAt)),
        }),
      }
    }

    const checkedInAt = new Date().toISOString()
    const updated: OrganizerTicket = {
      ...ticket,
      checkedIn: true,
      checkedInAt,
      checkedInBy: "demo-organizer",
      checkedInByName: "Mara Demo",
      checkIn: {
        status: "checked-in",
        at: checkedInAt,
        operatorId: "demo-organizer",
        operatorName: "Mara Demo",
      },
    }
    tickets = tickets.map((candidate) => (candidate.id === updated.id ? updated : candidate))
    return { success: true, data: updated }
  }

  return {
    eventList: async () => ({ success: true, data: inputs?.emptyEvents ? [] : demoOrganizerEvents }),
    eventGet: async (eventKey) => {
      const event = demoOrganizerEvents.find((candidate) => candidate.eventKey === eventKey)
      return event ? { success: true, data: event } : error("organizer.event.not-found")
    },
    ticketList: async (eventKey, search, paginationOpts: PaginationOptions) => {
      const normalizedSearch = search.trim().toLocaleLowerCase()
      const matchingTickets = tickets.filter(
        (ticket) =>
          ticket.eventKey === eventKey &&
          (!normalizedSearch ||
            ticket.participantName.toLocaleLowerCase().includes(normalizedSearch) ||
            ticket.buyerName.toLocaleLowerCase().includes(normalizedSearch)),
      )
      const start = paginationCursorRead(paginationOpts.cursor)
      const page = matchingTickets.slice(start, start + paginationOpts.numItems)
      const next = start + page.length
      const data: OrganizerTicketListPage = {
        page,
        isDone: next >= matchingTickets.length,
        continueCursor: String(next),
      }
      return {
        success: true,
        data,
      }
    },
    ticketGet: async (eventKey, ticketId) => {
      const ticket = ticketFind(ticketId)
      if (!ticket || ticket.eventKey !== eventKey) return error("organizer.ticket.not-found")
      return { success: true, data: ticket }
    },
    ticketCheckIn: async (eventKey, ticketId) => ticketCheckInApply(eventKey, ticketFind(ticketId)),
    ticketCheckInCode: async (eventKey, ticketCode) => {
      if (ticketCode === "DEMO-WRONG-EVENT") {
        return error("organizer.check-in.wrong-event")
      }
      return ticketCheckInApply(
        eventKey,
        tickets.find((ticket) => ticket.code === ticketCode),
      )
    },
    ticketReset: async (eventKey, ticketId) => {
      const ticket = ticketFind(ticketId)
      if (!ticket || ticket.eventKey !== eventKey) return error("organizer.ticket.not-found")
      if (!ticket.checkedIn) return error("organizer.check-in.not-checked-in")
      const updated: OrganizerTicket = {
        ...ticket,
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null,
        checkedInByName: null,
        checkIn: { status: "not-checked-in", at: null, operatorId: null, operatorName: null },
      }
      tickets = tickets.map((candidate) => (candidate.id === updated.id ? updated : candidate))
      return { success: true, data: updated }
    },
  }
}

function paginationCursorRead(cursor: string | null): number {
  if (cursor === null) return 0
  const value = Number.parseInt(cursor, 10)
  return Number.isInteger(value) && value >= 0 ? value : 0
}
