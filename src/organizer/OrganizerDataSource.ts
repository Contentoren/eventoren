import type { PaginationOptions } from "convex/server"
import type { Accessor } from "solid-js"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"
import type { OrganizerTicketListPage } from "./OrganizerTicketListPage.ts"

export type OrganizerDataSource = {
  /** Optional live reads; Promise methods below remain the SSR/capability-source contract. */
  readonly eventListResult?: () => Accessor<OrganizerDataResult<readonly OrganizerEvent[]> | undefined>
  readonly eventGetResult?: (eventKey: Accessor<string>) => Accessor<OrganizerDataResult<OrganizerEvent> | undefined>
  readonly ticketListResult?: (
    eventKey: Accessor<string>,
    search: Accessor<string>,
  ) => OrganizerReactiveQuery<OrganizerTicketListPage>
  readonly ticketGetResult?: (
    eventKey: Accessor<string>,
    ticketId: Accessor<OrganizerTicket["id"] | undefined>,
  ) => Accessor<OrganizerDataResult<OrganizerTicket> | undefined>
  readonly eventList: () => Promise<OrganizerDataResult<readonly OrganizerEvent[]>>
  readonly eventGet: (eventKey: string) => Promise<OrganizerDataResult<OrganizerEvent>>
  readonly ticketList: (
    eventKey: string,
    search: string,
    paginationOpts: PaginationOptions,
  ) => Promise<OrganizerDataResult<OrganizerTicketListPage>>
  readonly ticketGet: (
    eventKey: string,
    ticketId: OrganizerTicket["id"],
  ) => Promise<OrganizerDataResult<OrganizerTicket>>
  readonly ticketCheckIn: (
    eventKey: string,
    ticketId: OrganizerTicket["id"],
  ) => Promise<OrganizerDataResult<OrganizerTicket>>
  readonly ticketCheckInCode: (eventKey: string, ticketCode: string) => Promise<OrganizerDataResult<OrganizerTicket>>
  readonly ticketReset: (
    eventKey: string,
    ticketId: OrganizerTicket["id"],
  ) => Promise<OrganizerDataResult<OrganizerTicket>>
}

/** `result` may represent the accumulated pages; `loadMore` requests the next page. */
export type OrganizerReactiveQuery<T> = {
  readonly result: Accessor<OrganizerDataResult<T> | undefined>
  readonly loadMore: () => void
}
