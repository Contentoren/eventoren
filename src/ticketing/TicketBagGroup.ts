import type { EventItem } from "../events/EventItem.ts"
import type { TicketBagItem } from "./TicketBagItem.ts"

export type TicketBagGroup = {
  readonly event: EventItem
  readonly eventDateLabel: string
  readonly eventLocationLabel: string
  readonly items: readonly TicketBagItem[]
}
