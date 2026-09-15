import type { Accessor } from "solid-js"
import type { ApiClientResult } from "../client/apiClient.js"
import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { EventCatalogView } from "../events/EventCatalogView.tsx"
import type { EventFilter } from "../events/EventFilter.ts"
import { indexPageStateCreate } from "../events/indexPageStateCreate.ts"

export function HomePage(props: {
  initialPage: Accessor<{ filter: EventFilter; result: ApiClientResult<CatalogEventListPublishedPage> }>
}) {
  const state = indexPageStateCreate({ initialPage: props.initialPage })

  return (
    <SiteFrame>
      <EventCatalogView
        filter={state.filter()}
        events={state.events()}
        resultCount={state.resultCount()}
        isDone={state.isDone()}
        isLoading={state.isLoading()}
        error={state.error()}
        isBookingSuccess={state.isBookingSuccess()}
        dismissBookingSuccess={state.dismissBookingSuccess}
        applyFilter={state.applyFilter}
        loadMore={state.loadMore}
        retry={state.retry}
      />
    </SiteFrame>
  )
}
