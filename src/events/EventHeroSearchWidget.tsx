import { For, Show } from "solid-js"
import { UiButton } from "../ui/UiButton.tsx"
import type { EventFilter } from "./EventFilter.ts"
import { eventHeroSearchWidgetStateCreate } from "./eventHeroSearchWidgetStateCreate.ts"

export function EventHeroSearchWidget(props: { filter: EventFilter; onFilterChange: (filter: EventFilter) => void }) {
  const state = eventHeroSearchWidgetStateCreate({
    filter: () => props.filter,
    onFilterChange: (filter) => props.onFilterChange(filter),
  })

  return (
    <form
      class="rounded-card border border-border-strong bg-surface p-space-6 text-content shadow-2xl shadow-black/50"
      aria-label="Tickets suchen"
      onSubmit={(event) => {
        event.preventDefault()
        state.submitSearch()
      }}
    >
      <div
        class="flex flex-wrap gap-space-1 rounded-control bg-surface-muted p-space-1"
        role="tablist"
        aria-label="Ticketart"
      >
        <For each={state.tabs()}>
          {(tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={state.activeTabId() === tab.id}
              onClick={() => state.selectTab(tab.id)}
              class={`focus-ring flex-1 rounded-control px-space-4 py-space-2 text-sm font-semibold transition-colors ${
                state.activeTabId() === tab.id
                  ? "bg-surface text-brand-accent shadow-sm"
                  : "text-content-muted hover:text-content"
              }`}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>

      <div class="mt-space-6 grid grid-cols-1 gap-space-4 sm:grid-cols-2">
        <div>
          <label for="event-hero-term" class="mb-space-2 block text-sm font-medium text-content">
            Von · Stadt oder Location
          </label>
          <input
            id="event-hero-term"
            type="search"
            value={state.city()}
            placeholder="z. B. Berlin oder Hamburg"
            onInput={(event) => state.changeCity(event.currentTarget.value)}
            class="focus-ring h-12 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content placeholder:text-content-muted"
          />
        </div>

        <div>
          <label for="event-hero-city" class="mb-space-2 block text-sm font-medium text-content">
            Nach · Event, Künstler oder Festival
          </label>
          <input
            id="event-hero-city"
            type="search"
            value={state.term()}
            placeholder="z. B. Wacken Open Air"
            onInput={(event) => state.changeTerm(event.currentTarget.value)}
            class="focus-ring h-12 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content placeholder:text-content-muted"
          />
        </div>
      </div>

      <div class="mt-space-4 grid grid-cols-1 gap-space-4 sm:grid-cols-2">
        <div>
          <label for="event-hero-date" class="mb-space-2 block text-sm font-medium text-content">
            Datum
          </label>
          <div class="relative">
            <input
              id="event-hero-date"
              type="date"
              value={state.date()}
              aria-label={`Datum wählen, aktuell ${state.dateLabel()}`}
              onInput={(event) => state.changeDate(event.currentTarget.value)}
              class="focus-ring h-12 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm font-semibold text-content"
            />
          </div>
          <p class="mt-space-1 text-xs text-content-muted" aria-live="polite">
            {state.dateLabel()}
          </p>
        </div>

        <fieldset>
          <legend class="mb-space-2 block text-sm font-medium text-content">Tickets</legend>
          <div class="flex h-12 items-center justify-between rounded-control border border-border-strong bg-surface-muted px-space-2">
            <button
              type="button"
              onClick={() => state.decreaseTicketCount()}
              disabled={!state.canDecreaseTicketCount()}
              aria-label="Ein Ticket weniger"
              class="focus-ring size-9 rounded-control text-content-muted transition-colors hover:bg-surface-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-60"
            >
              −
            </button>
            <span class="text-sm font-semibold text-content" aria-live="polite">
              {state.ticketCountLabel()}
            </span>
            <button
              type="button"
              onClick={() => state.increaseTicketCount()}
              disabled={!state.canIncreaseTicketCount()}
              aria-label="Ein Ticket mehr"
              class="focus-ring size-9 rounded-control text-content-muted transition-colors hover:bg-surface-muted hover:text-content disabled:cursor-not-allowed disabled:opacity-60"
            >
              +
            </button>
          </div>
        </fieldset>
      </div>

      <fieldset class="mt-space-5">
        <legend class="mb-space-2 text-sm font-medium text-content">Zeitfenster</legend>
        <div class="flex flex-wrap gap-space-2">
          <For each={state.timeWindowOptions()}>
            {(option) => (
              <button
                type="button"
                aria-pressed={state.activeTimeWindow() === option.value}
                onClick={() => state.selectTimeWindow(option.value)}
                class={`focus-ring rounded-control px-space-4 py-space-2 text-sm font-medium transition-colors ${
                  state.activeTimeWindow() === option.value
                    ? "bg-brand text-brand-content"
                    : "bg-surface-muted text-content-muted ring-1 ring-inset ring-border-strong hover:text-content hover:ring-brand-accent"
                }`}
              >
                {option.label}
              </button>
            )}
          </For>
        </div>
      </fieldset>

      <div class="mt-space-5">
        <button
          type="button"
          onClick={() => state.toggleDiscount()}
          aria-expanded={state.discountOpen()}
          aria-controls="event-hero-discount-panel"
          class="focus-ring inline-flex items-center gap-space-2 rounded-control text-sm font-semibold text-brand-accent underline-offset-4 hover:underline"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            class={`size-4 transition-transform ${state.discountOpen() ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
          >
            <path d="M6 8l4 4 4-4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Rabattcode hinzufügen
        </button>

        <Show when={state.discountOpen()}>
          <div id="event-hero-discount-panel" class="mt-space-3">
            <label for="event-hero-discount" class="mb-space-2 block text-sm font-medium text-content">
              Rabatt- oder Aktionscode
            </label>
            <input
              id="event-hero-discount"
              type="text"
              value={state.discountCode()}
              placeholder="z. B. EVENT10"
              onInput={(event) => state.changeDiscountCode(event.currentTarget.value)}
              class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm uppercase text-content placeholder:normal-case placeholder:text-content-muted"
            />
          </div>
        </Show>
      </div>

      <UiButton type="submit" size="lg" block class="mt-space-6">
        Günstige Tickets finden
      </UiButton>
    </form>
  )
}
