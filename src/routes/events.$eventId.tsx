import { createFileRoute, notFound } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { Show } from "solid-js"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { EventDetailPageView } from "../events/EventDetailPageView.tsx"
import { EventDetailUnavailableView } from "../events/EventDetailUnavailableView.tsx"
import { EventBookingCountdownPage } from "../events/EventBookingCountdownPage.tsx"
import { eventBookingReleaseStateCreate } from "../events/eventBookingReleaseStateCreate.ts"
import { eventDetailPageStateCreate } from "../events/eventDetailPageStateCreate.ts"
import type { EventItem } from "../events/EventItem.ts"
import { eventDetailHeadCreate } from "../seo/eventDetailHeadCreate.ts"
import { catalogEventPublicGet } from "../server/catalogEventPublicGet.js"
import { ticketSelectionSearchParse } from "../ticketing/ticketSelectionSearchParse.ts"

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
  .handler(async ({ data }) => ({
    ...(await catalogEventPublicGet({ eventKey: data })),
    observedAt: Date.now(),
  }))

function EventDetailPage() {
  const result = Route.useLoaderData()

  return (
    <Show when={result().success ? result().data : undefined} fallback={<EventDetailUnavailableView />}>
      {(event) => <EventBookingPage event={event()} observedAt={result().observedAt} />}
    </Show>
  )
}

function EventBookingPage(props: { event: EventItem; observedAt: number }) {
  const state = eventBookingReleaseStateCreate({ event: () => props.event, observedAt: () => props.observedAt })

  return (
    <SiteFrame>
      <Show when={state.isOpen()} fallback={<EventBookingCountdownPage event={props.event} now={state.now} />}>
        <LoadedEventDetail event={props.event} />
      </Show>
    </SiteFrame>
  )
}

function LoadedEventDetail(props: { event: EventItem }) {
  const state = eventDetailPageStateCreate({ event: () => props.event })

  return <EventDetailPageView event={props.event} state={state} />
}
