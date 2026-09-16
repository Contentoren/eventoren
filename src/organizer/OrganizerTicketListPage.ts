import type { OrganizerTicket } from "./OrganizerTicket.ts"

export type OrganizerTicketListPage = {
  readonly page: readonly OrganizerTicket[]
  readonly isDone: boolean
  readonly continueCursor: string
}
