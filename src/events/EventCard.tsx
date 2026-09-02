import { EventCardTicket } from "./EventCardTicket.tsx"
import type { EventCardVariation } from "./EventCardVariation.ts"
import type { EventItem } from "./EventItem.ts"

export function EventCard(props: { event: EventItem; variation?: EventCardVariation }) {
  return <EventCardTicket event={props.event} />
}
