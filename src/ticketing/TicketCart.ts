import type { TicketCartLine } from "./TicketCartLine.ts"

export type TicketCart = {
  eventId: string
  lines: readonly TicketCartLine[]
}
