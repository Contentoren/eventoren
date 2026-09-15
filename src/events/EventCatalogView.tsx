import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { EventBookingThankYouBanner } from "./EventBookingThankYouBanner.tsx"
import type { EventFilter } from "./EventFilter.ts"
import { EventFilterBar } from "./EventFilterBar.tsx"
import { EventGrid } from "./EventGrid.tsx"
import type { EventItem } from "./EventItem.ts"

export function EventCatalogView(props: {
  filter: EventFilter
  events: readonly EventItem[]
  resultCount: number
  isDone: boolean
  isLoading: boolean
  error: string
  isBookingSuccess: boolean
  dismissBookingSuccess: () => void
  applyFilter: (filter: EventFilter) => void
  loadMore: () => void
  retry: () => void
  eventHref?: (event: EventItem) => string
}) {
  return (
    <main id="content" tabindex="-1">
      <section class="border-b border-border-subtle bg-surface-muted/40">
        <UiContainer class="flex flex-col gap-space-5 py-14 sm:py-20">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eventoren</p>
          <h1 class="max-w-3xl text-4xl font-semibold tracking-tight text-content sm:text-6xl">
            Besondere Erlebnisse. Direkt dein Ticket.
          </h1>
          <p class="max-w-2xl text-base leading-relaxed text-content-muted sm:text-lg">
            Entdecke veröffentlichte Events und sichere dir Tickets mit transparenten Preisen und digitaler Zustellung.
          </p>
        </UiContainer>
      </section>

      <Show when={props.isBookingSuccess}>
        <EventBookingThankYouBanner onDismiss={props.dismissBookingSuccess} />
      </Show>

      <UiContainer class="flex flex-col gap-space-6 py-space-8 sm:py-12">
        <Show when={props.error.length > 0 && props.events.length === 0}>
          <div class="flex flex-wrap items-center justify-between gap-space-3 rounded-card border border-danger/50 bg-danger-soft p-space-6">
            <p class="text-sm text-danger" role="alert">
              Der Eventkatalog ist gerade nicht verfügbar. Bitte versuche es später erneut.
            </p>
            <Button variant="outline" size="sm" onClick={props.retry}>
              Erneut versuchen
            </Button>
          </div>
        </Show>

        <Show when={props.error.length === 0 || props.events.length > 0}>
          <EventFilterBar
            filter={props.filter}
            resultCount={props.resultCount}
            isDone={props.isDone}
            onFilterChange={props.applyFilter}
          />
          <Show
            when={props.events.length > 0 || !props.isLoading}
            fallback={
              <div
                class="rounded-card border border-border-subtle bg-surface-muted p-space-6 text-sm text-content-muted"
                aria-live="polite"
              >
                Events werden geladen …
              </div>
            }
          >
            <EventGrid
              events={props.events}
              emptyMessage="Keine veröffentlichten Events entsprechen deiner Suche."
              eventHref={props.eventHref}
            />
          </Show>

          <Show when={props.error.length > 0 && props.events.length > 0}>
            <div class="flex flex-wrap items-center justify-between gap-space-3 rounded-card border border-danger/50 bg-danger-soft p-space-6">
              <p class="text-sm text-danger" role="alert">
                Weitere Events konnten nicht geladen werden.
              </p>
              <Button variant="outline" size="sm" onClick={props.retry}>
                Erneut versuchen
              </Button>
            </div>
          </Show>

          <Show when={props.events.length > 0 && !props.isDone && props.error.length === 0}>
            <div class="flex justify-center">
              <Button variant="outline" disabled={props.isLoading} onClick={props.loadMore}>
                {props.isLoading ? "Weitere Events werden geladen …" : "Weitere Events laden"}
              </Button>
            </div>
          </Show>
        </Show>
      </UiContainer>
    </main>
  )
}
