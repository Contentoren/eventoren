import { EventCardTicket } from "./EventCardTicket.tsx"
import type { EventItem } from "./EventItem.ts"

export function EventCard(props: { event: EventItem; href?: string }) {
  return <EventCardTicket event={props.event} href={props.href} />
}
