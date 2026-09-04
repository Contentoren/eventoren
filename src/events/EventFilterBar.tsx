import { For } from "solid-js"
import type { EventCategory } from "./EventCategory.ts"
import type { EventFilter } from "./EventFilter.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventFilterBarStateCreate } from "./eventFilterBarStateCreate.ts"

export function EventFilterBar(props: {
  filter: EventFilter
  resultCount: number
  onFilterChange: (filter: EventFilter) => void
}) {
  const state = eventFilterBarStateCreate({
    filter: () => props.filter,
    resultCount: () => props.resultCount,
    onFilterChange: (filter) => props.onFilterChange(filter),
  })

  return (
    <section class="flex flex-col gap-space-4" aria-label="Events filtern">
      <search aria-label="Events durchsuchen">
        <form
          class="grid grid-cols-1 gap-space-2 rounded-card border border-border-strong/40 bg-surface p-space-2 shadow-lg sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1fr_auto] lg:items-center"
          onSubmit={state.submitSearch}
        >
          {/* Genre selection */}
          <div class="relative flex h-13 items-center rounded-control border border-border-subtle bg-surface-muted px-space-4 transition-colors hover:border-border-strong focus-within:border-brand-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-accent/20">
            <label for="event-filter-genre" class="sr-only">
              Genre
            </label>
            <span class="mr-space-3 shrink-0 text-content-muted" aria-hidden="true">
              <svg class="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3z" />
              </svg>
            </span>
            <select
              id="event-filter-genre"
              aria-label="Genre"
              value={props.filter.category}
              onChange={(event) => state.selectCategory(event.currentTarget.value as EventCategory | "alle")}
              class="h-full w-full cursor-pointer appearance-none bg-transparent pr-space-6 text-sm font-medium text-content focus:outline-none"
            >
              <For each={state.categoryOptions()}>
                {(option) => (
                  <option value={option.value} class="bg-surface text-content">
                    {option.label}
                  </option>
                )}
              </For>
            </select>
            <span class="pointer-events-none absolute right-space-4 text-content-muted" aria-hidden="true">
              <svg
                class="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Ort / Search input */}
          <div class="relative flex h-13 items-center rounded-control border border-border-subtle bg-surface-muted px-space-4 transition-colors hover:border-border-strong focus-within:border-brand-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-accent/20">
            <label for="event-filter-location" class="sr-only">
              Ort wählen
            </label>
            <span class="mr-space-3 shrink-0 text-content-muted" aria-hidden="true">
              <svg class="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5" />
              </svg>
            </span>
            <input
              id="event-filter-location"
              type="search"
              aria-label="Ort wählen"
              placeholder="Alle Städte oder Künstler"
              value={props.filter.location}
              onInput={(event) => state.selectLocation(event.currentTarget.value)}
              class="h-full w-full bg-transparent text-sm font-medium text-content placeholder:text-content-muted/80 focus:outline-none"
            />
          </div>

          {/* Datum / Zeitraum selection */}
          <div class="relative flex h-13 items-center rounded-control border border-border-subtle bg-surface-muted px-space-4 transition-colors hover:border-border-strong focus-within:border-brand-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand-accent/20">
            <label for="event-filter-date" class="sr-only">
              Datum
            </label>
            <span class="mr-space-3 shrink-0 text-content-muted" aria-hidden="true">
              <svg class="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 16H5V10h14zM9 14H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2zm-8 4H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2z" />
              </svg>
            </span>
            <select
              id="event-filter-date"
              aria-label="Datum"
              value={props.filter.timeWindow}
              onChange={(event) => state.selectTimeWindow(event.currentTarget.value as EventTimeWindow)}
              class="h-full w-full cursor-pointer appearance-none bg-transparent pr-space-6 text-sm font-medium text-content focus:outline-none"
            >
              <For each={state.timeWindowOptions()}>
                {(option) => (
                  <option value={option.value} class="bg-surface text-content">
                    {option.label}
                  </option>
                )}
              </For>
            </select>
            <span class="pointer-events-none absolute right-space-4 text-content-muted" aria-hidden="true">
              <svg
                class="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Submit action */}
          <button
            type="submit"
            class="focus-ring flex h-13 items-center justify-center rounded-control bg-brand px-space-6 text-sm font-bold text-brand-content shadow-md transition-all hover:bg-brand-strong active:scale-[0.99] whitespace-nowrap"
          >
            Events suchen
          </button>
        </form>
      </search>

      <div class="flex items-center justify-between px-space-1">
        <p class="text-sm font-medium text-content-muted" aria-live="polite">
          {state.resultLabel()}
        </p>
      </div>
    </section>
  )
}
