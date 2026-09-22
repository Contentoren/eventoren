import { TicketBagPageView } from "../../ticketing/TicketBagPageView.tsx"
import { demoCatalogEvents } from "../fixtures/demoCatalogEvents.ts"
import { demoCartPageStateCreate } from "../state/demoCartPageStateCreate.ts"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoCart(props: { readonly empty?: boolean }) {
  const state = demoCartPageStateCreate({ events: demoCatalogEvents, empty: props.empty })

  return (
    <DemoSiteFrame currentId={props.empty ? "cart-empty" : "cart"} cartQuantity={state.totalQuantity}>
      <TicketBagPageView
        state={state}
        eventHref={(event) => `/demo/customer/events/${event.id}`}
        eventsHref="/demo/customer/events"
        showClearBag
      />
    </DemoSiteFrame>
  )
}
