import { TicketBagPageView } from "../../ticketing/TicketBagPageView.tsx"
import { demoCatalogEvents } from "../fixtures/demoCatalogEvents.ts"
import { demoCartPageStateCreate } from "../state/demoCartPageStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoCart(props: { readonly empty?: boolean }) {
  const state = demoCartPageStateCreate({ events: demoCatalogEvents, empty: props.empty })

  return (
    <DemoShell currentId={props.empty ? "cart-empty" : "cart"}>
      <TicketBagPageView
        state={state}
        eventHref={(event) => `/demo/events/${event.id}`}
        eventsHref="/demo/events"
        showClearBag
      />
    </DemoShell>
  )
}
