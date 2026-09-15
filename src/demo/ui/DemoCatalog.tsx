import { EventCatalogView } from "../../events/EventCatalogView.tsx"
import { demoCatalogEvents } from "../fixtures/demoCatalogEvents.ts"
import { demoCatalogPageStateCreate } from "../state/demoCatalogPageStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoCatalog(props: { readonly scenario?: "default" | "empty" | "error" | "booking-success" }) {
  const state = demoCatalogPageStateCreate({ events: demoCatalogEvents, scenario: props.scenario })
  const scenario = props.scenario ?? "default"

  return (
    <DemoShell currentId={scenario === "default" ? "events" : `events-${scenario}`}>
      <EventCatalogView
        filter={state.filter()}
        events={state.visibleEvents()}
        resultCount={state.resultCount()}
        isDone={true}
        isLoading={false}
        error={state.error()}
        isBookingSuccess={state.isBookingSuccess()}
        dismissBookingSuccess={state.dismissBookingSuccess}
        applyFilter={state.applyFilter}
        loadMore={() => undefined}
        retry={() => undefined}
        eventHref={(event) => `/demo/events/${event.id}`}
      />
    </DemoShell>
  )
}
