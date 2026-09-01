import { Match, Switch } from "solid-js"
import { EventCardGlass } from "./EventCardGlass.tsx"
import { EventCardPoster } from "./EventCardPoster.tsx"
import { EventCardTicket } from "./EventCardTicket.tsx"
import type { EventCardVariation } from "./EventCardVariation.ts"
import type { EventItem } from "./EventItem.ts"

/** Renders the requested design variation so the three tiles can be compared. */
export function EventCard(props: { event: EventItem; variation?: EventCardVariation }) {
  return (
    <Switch fallback={<EventCardGlass event={props.event} />}>
      <Match when={props.variation === "ticket"}>
        <EventCardTicket event={props.event} />
      </Match>
      <Match when={props.variation === "poster"}>
        <EventCardPoster event={props.event} />
      </Match>
    </Switch>
  )
}
