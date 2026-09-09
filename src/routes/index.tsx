import { createFileRoute } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { SiteFrame } from "../components/SiteFrame"
import { EventBookingThankYouBanner } from "../events/EventBookingThankYouBanner.tsx"
import { EventFilterBar } from "../events/EventFilterBar.tsx"
import { EventGrid } from "../events/EventGrid.tsx"
import { EventHeroKnockout } from "../events/EventHeroKnockout.tsx"
import { EventHeroMagnific } from "../events/EventHeroMagnific.tsx"
import { eventDiscoverySearchParse } from "../events/eventDiscoverySearchParse.ts"
import { eventHeroResultsAnchorId } from "../events/eventHeroResultsAnchorId.ts"
import { indexPageStateCreate } from "../events/indexPageStateCreate.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate"
import { UiContainer } from "../ui/UiContainer.tsx"

const heroDescription =
  "Konzerte, Festivals, Kultur, Sport und Reisen – kuratiert, transparent bepreist und mit digitalem Ticket direkt aufs Handy."

export const Route = createFileRoute("/")({
  head: () => seoHeadCreate("/"),
  validateSearch: eventDiscoverySearchParse,
  component: DiscoveryPage,
})

function DiscoveryPage() {
  const state = indexPageStateCreate()

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <Show when={state.isBookingSuccess()}>
          <EventBookingThankYouBanner onDismiss={() => state.dismissBookingSuccess()} />
        </Show>

        <EventHeroKnockout
          description={heroDescription}
          eventCount={state.totalCount()}
          filter={state.filter()}
          onFilterChange={(filter) => state.applyFilter(filter)}
        />

        <EventHeroMagnific eventCount={state.totalCount()} />

        <UiContainer class="flex flex-col gap-space-7 py-space-7" id={eventHeroResultsAnchorId}>
          <EventFilterBar
            filter={state.filter()}
            resultCount={state.resultCount()}
            onFilterChange={(filter) => state.applyFilter(filter)}
          />
          <EventGrid events={state.visibleEvents()} />
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
