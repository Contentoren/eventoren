import { UiBadge } from "../ui/UiBadge.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { EventFilter } from "./EventFilter.ts"
import { EventHeroPartnerBar } from "./EventHeroPartnerBar.tsx"
import { EventHeroReassurancePanel } from "./EventHeroReassurancePanel.tsx"
import { EventHeroSearchWidget } from "./EventHeroSearchWidget.tsx"
import { eventHeroStateCreate } from "./eventHeroStateCreate.ts"
import { eventImagePlaceholder } from "./eventImagePlaceholder.ts"

export function EventHero(props: {
  title: string
  description: string
  eventCount: number
  filter: EventFilter
  onFilterChange: (filter: EventFilter) => void
}) {
  const state = eventHeroStateCreate({ eventCount: () => props.eventCount })

  return (
    <section class="relative overflow-hidden bg-surface-inverted" aria-label="Tickets und Erlebnisse finden">
      <img
        src={eventImagePlaceholder}
        alt=""
        aria-hidden="true"
        width="1200"
        height="630"
        class="absolute inset-0 size-full object-cover opacity-20"
      />
      <div class="absolute inset-0 bg-linear-to-r from-surface-inverted via-surface-inverted/90 to-surface-inverted/60" />

      <UiContainer width="wide" class="relative py-space-7 sm:py-16">
        <div class="max-w-3xl">
          <UiBadge tone="brand">{state.eventCountLabel()}</UiBadge>
          <h1 class="mt-space-5 text-3xl font-semibold tracking-tight text-content-inverted sm:text-5xl">
            {props.title}
          </h1>
          <p class="mt-space-5 text-base leading-relaxed text-white/90">{props.description}</p>
        </div>

        <div class="mt-space-7 grid grid-cols-1 items-start gap-space-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <EventHeroSearchWidget filter={props.filter} onFilterChange={(filter) => props.onFilterChange(filter)} />
          <EventHeroReassurancePanel pillars={state.pillars()} />
        </div>

        <EventHeroPartnerBar organizers={state.organizers()} transports={state.transports()} />
      </UiContainer>
    </section>
  )
}
