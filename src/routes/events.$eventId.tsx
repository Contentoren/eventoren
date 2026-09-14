import { createFileRoute, notFound } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { Show } from "solid-js"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { EventDetailBanner } from "../events/EventDetailBanner.tsx"
import { EventDetailHeader } from "../events/EventDetailHeader.tsx"
import { EventDetailInfo } from "../events/EventDetailInfo.tsx"
import { eventDetailPageStateCreate } from "../events/eventDetailPageStateCreate.ts"
import type { EventItem } from "../events/EventItem.ts"
import { eventDetailHeadCreate } from "../seo/eventDetailHeadCreate.ts"
import { catalogEventPublicGet } from "../server/catalogEventPublicGet.js"
import { TicketCartSummary } from "../ticketing/TicketCartSummary.tsx"
import { TicketStickyCta } from "../ticketing/TicketStickyCta.tsx"
import { TicketTierSelector } from "../ticketing/TicketTierSelector.tsx"
import { ticketSelectionSearchParse } from "../ticketing/ticketSelectionSearchParse.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

export const Route = createFileRoute("/events/$eventId")({
  validateSearch: ticketSelectionSearchParse,
  loader: async ({ params }) => {
    const result = await getCatalogEvent({ data: params.eventId })
    if (result.success && result.data === null) throw notFound()
    return result
  },
  head: ({ loaderData }) => eventDetailHeadCreate(loaderData?.success ? (loaderData.data ?? undefined) : undefined),
  component: EventDetailPage,
})

const getCatalogEvent = createServerFn({ method: "GET" })
  .validator((eventKey: unknown) => {
    if (typeof eventKey !== "string" || eventKey.length === 0) throw notFound()
    return eventKey
  })
  .handler(({ data }) => catalogEventPublicGet({ eventKey: data }))

function EventDetailPage() {
  const result = Route.useLoaderData()

  return (
    <Show
      when={result().success ? result().data : undefined}
      fallback={
        <SiteFrame>
          <main id="content" tabindex="-1">
            <UiContainer class="py-space-7">
              <p
                role="alert"
                class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
              >
                Das Event ist gerade nicht verfügbar. Bitte versuche es später erneut.
              </p>
            </UiContainer>
          </main>
        </SiteFrame>
      }
    >
      {(event) => <LoadedEventDetail event={event()} />}
    </Show>
  )
}

function LoadedEventDetail(props: { event: EventItem }) {
  const state = eventDetailPageStateCreate({ event: () => props.event })

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <EventDetailBanner imageUrl={props.event.imageUrl} imageAlt={props.event.imageAlt} />

        <UiContainer class="flex flex-col gap-space-7 pt-space-3 pb-28 sm:py-space-7 lg:pb-space-7">
          <EventDetailHeader event={props.event} />

          <div class="grid gap-space-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="flex flex-col gap-space-7">
              <TicketTierSelector
                event={props.event}
                cart={state.cart()}
                onCartChange={(cart) => state.applyCart(cart)}
              />
              <EventDetailInfo event={props.event} />
            </div>

            <div class="lg:sticky lg:top-24 lg:self-start">
              <TicketCartSummary
                event={props.event}
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
          event={props.event}
          cart={state.cart()}
          label="In den Warenkorb"
          onContinue={() => state.goToCart()}
        />
      </main>
    </SiteFrame>
  )
}
