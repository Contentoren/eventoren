import { For } from "solid-js"
import type { EventFilter } from "./EventFilter.ts"
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
    <section class="flex flex-col gap-space-5" aria-label="Events filtern">
      <div class="flex flex-col gap-space-4 sm:flex-row sm:items-end">
        <div class="flex-1">
          <label for="event-search" class="mb-space-2 block text-sm font-semibold text-content">
            Suche
          </label>
          <input
            id="event-search"
            type="search"
            value={props.filter.query}
            placeholder="Künstler, Stadt oder Veranstaltungsort"
            onInput={(event) => state.selectQuery(event.currentTarget.value)}
            class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content transition-colors placeholder:text-content-muted/80 hover:border-brand-accent/60 focus:border-brand-accent"
          />
        </div>

        <div class="sm:w-64">
          <label for="event-category" class="mb-space-2 block text-sm font-semibold text-content">
            Kategorie
          </label>
          <select
            id="event-category"
            value={props.filter.category}
            onChange={(event) => state.selectCategory(event.currentTarget.value as EventFilter["category"])}
            class="focus-ring h-11 w-full rounded-control border border-border-strong bg-surface-muted px-space-4 text-sm text-content transition-colors hover:border-brand-accent/60 focus:border-brand-accent"
          >
            <For each={state.categoryOptions()}>{(option) => <option value={option.value}>{option.label}</option>}</For>
          </select>
        </div>
      </div>

      <fieldset class="flex flex-wrap items-center gap-space-3">
        <legend class="sr-only">Zeitraum</legend>
        <For each={state.timeWindowOptions()}>
          {(option) => (
            <button
              type="button"
              aria-pressed={props.filter.timeWindow === option.value}
              onClick={() => state.selectTimeWindow(option.value)}
              class={`focus-ring rounded-control px-space-4 py-space-2 text-sm font-medium transition-colors ${
                props.filter.timeWindow === option.value
                  ? "bg-brand text-brand-content shadow-lg shadow-brand/30"
                  : "bg-surface-muted text-content-muted ring-1 ring-inset ring-border-strong hover:text-content hover:ring-brand-accent"
              }`}
            >
              {option.label}
            </button>
          )}
        </For>
      </fieldset>

      <p class="text-sm font-medium text-content-muted" aria-live="polite">
        {state.resultLabel()}
      </p>
    </section>
  )
}
