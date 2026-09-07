import { createFileRoute, notFound } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame"
import { EventDetailBanner } from "../events/EventDetailBanner.tsx"
import { EventDetailHeader } from "../events/EventDetailHeader.tsx"
import { EventDetailInfo } from "../events/EventDetailInfo.tsx"
import { eventDetailPageStateCreate } from "../events/eventDetailPageStateCreate.ts"
import { eventFindById } from "../events/eventFindById.ts"
import { eventDetailHeadCreate } from "../seo/eventDetailHeadCreate.ts"
import { TicketCartSummary } from "../ticketing/TicketCartSummary.tsx"
import { TicketStickyCta } from "../ticketing/TicketStickyCta.tsx"
import { TicketTierSelector } from "../ticketing/TicketTierSelector.tsx"
import { ticketSelectionSearchParse } from "../ticketing/ticketSelectionSearchParse.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

export const Route = createFileRoute("/events/$eventId")({
  validateSearch: ticketSelectionSearchParse,
  loader: ({ params }) => {
    const found = eventFindById(params.eventId)
    if (!found.success) throw notFound()
    return found.data
  },
  head: ({ loaderData }) => eventDetailHeadCreate(loaderData),
  component: EventDetailPage,
})

function EventDetailPage() {
  const state = eventDetailPageStateCreate()

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <EventDetailBanner imageUrl={state.event().imageUrl} imageAlt={state.event().imageAlt} />

        <UiContainer class="flex flex-col gap-space-7 pt-space-3 pb-28 sm:py-space-7 lg:pb-space-7">
          <EventDetailHeader event={state.event()} />

          <div class="grid gap-space-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="flex flex-col gap-space-7">
              <TicketTierSelector
                event={state.event()}
                cart={state.cart()}
                onCartChange={(cart) => state.applyCart(cart)}
              />
              <EventDetailInfo event={state.event()} />
            </div>

            <div class="lg:sticky lg:top-24 lg:self-start">
              <TicketCartSummary
                event={state.event()}
                cart={state.cart()}
                checkoutLabel="In den Warenkorb"
                onCartChange={(cart) => state.applyCart(cart)}
                onCheckout={() => state.goToCart()}
                onDirectCheckout={() => state.goToCheckout()}
              />
            </div>
          </div>
        </UiContainer>

        <TicketStickyCta
          event={state.event()}
          cart={state.cart()}
          label="In den Warenkorb"
          onContinue={() => state.goToCart()}
        />
      </main>
    </SiteFrame>
  )
}
