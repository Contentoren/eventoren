import { type Accessor, Show } from "solid-js"
import type { ApiClientResult } from "../client/apiClient.js"
import { EventBookingThankYouBanner } from "../events/EventBookingThankYouBanner.tsx"
import { EventFilterBar } from "../events/EventFilterBar.tsx"
import type { EventItem } from "../events/EventItem.ts"
import { EventGrid } from "../events/EventGrid.tsx"
import { indexPageStateCreate } from "../events/indexPageStateCreate.ts"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"

export function HomePage(props: { eventsResult: Accessor<ApiClientResult<readonly EventItem[]>> }) {
  const events = () => {
    const result = props.eventsResult()
    return result.success ? result.data : []
  }
  const state = indexPageStateCreate({
    events,
  })

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <section class="border-b border-border-subtle bg-surface-muted/40">
          <UiContainer class="flex flex-col gap-space-5 py-14 sm:py-20">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Eventoren</p>
            <h1 class="max-w-3xl text-4xl font-semibold tracking-tight text-content sm:text-6xl">
              Besondere Erlebnisse. Direkt dein Ticket.
            </h1>
            <p class="max-w-2xl text-base leading-relaxed text-content-muted sm:text-lg">
              Entdecke veröffentlichte Events und sichere dir Tickets mit transparenten Preisen und digitaler
              Zustellung.
            </p>
          </UiContainer>
        </section>

        <Show when={state.isBookingSuccess()}>
          <EventBookingThankYouBanner onDismiss={state.dismissBookingSuccess} />
        </Show>

        <UiContainer class="flex flex-col gap-space-6 py-space-8 sm:py-12">
          <Show
            when={props.eventsResult().success}
            fallback={
              <div
                class="rounded-card border border-danger/50 bg-danger-soft p-space-6 text-sm text-danger"
                role="alert"
              >
                Der Eventkatalog ist gerade nicht verfügbar. Bitte versuche es später erneut.
              </div>
            }
          >
            <EventFilterBar
              filter={state.filter()}
              resultCount={state.resultCount()}
              onFilterChange={state.applyFilter}
            />
            <EventGrid
              events={state.visibleEvents()}
              emptyMessage="Keine veröffentlichten Events entsprechen deiner Suche."
            />
          </Show>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
