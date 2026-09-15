import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"

export type OrganizerDataSource = {
  readonly eventList: (token: string) => Promise<OrganizerDataResult<readonly OrganizerEvent[]>>
  readonly ticketList: (
    eventKey: string,
    search: string,
    token: string,
  ) => Promise<OrganizerDataResult<readonly OrganizerTicket[]>>
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
