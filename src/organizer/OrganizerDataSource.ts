import type { PaginationOptions } from "convex/server"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"
import type { OrganizerTicketListPage } from "./OrganizerTicketListPage.ts"

export type OrganizerDataSource = {
  readonly eventList: (token: string) => Promise<OrganizerDataResult<readonly OrganizerEvent[]>>
  readonly eventGet: (eventKey: string, token: string) => Promise<OrganizerDataResult<OrganizerEvent>>
  readonly ticketList: (
    eventKey: string,
    search: string,
    token: string,
    paginationOpts: PaginationOptions,
  ) => Promise<OrganizerDataResult<OrganizerTicketListPage>>
  readonly ticketGet: (
    eventKey: string,
    ticketId: OrganizerTicket["id"],
    token: string,
  ) => Promise<OrganizerDataResult<OrganizerTicket>>
  readonly ticketCheckIn: (
    eventKey: string,
    ticketId: OrganizerTicket["id"],
    token: string,
  ) => Promise<OrganizerDataResult<OrganizerTicket>>
  readonly ticketCheckInCode: (
    eventKey: string,
    ticketCode: string,
    token: string,
  ) => Promise<OrganizerDataResult<OrganizerTicket>>
  readonly ticketReset: (
    eventKey: string,
    ticketId: OrganizerTicket["id"],
    token: string,
  ) => Promise<OrganizerDataResult<OrganizerTicket>>
}
