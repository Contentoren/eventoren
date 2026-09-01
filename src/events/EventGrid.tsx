import { For, Show } from "solid-js"
import { EventCard } from "./EventCard.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventCardVariationByIndex } from "./eventCardVariationByIndex.ts"

export function EventGrid(props: { events: readonly EventItem[]; emptyMessage?: string }) {
  return (
    <Show
      when={props.events.length > 0}
      fallback={
        <p class="rounded-card border border-dashed border-border-strong bg-surface-muted p-space-7 text-center text-sm text-content-muted">
          {props.emptyMessage ?? "Keine Events gefunden. Passe deine Filter an."}
        </p>
      }
    >
      <ul
        class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-space-4 gap-y-space-6 pt-7 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Eventliste"
      >
        <For each={props.events}>
          {(event, index) => (
            <li class="h-full">
              <EventCard event={event} variation={eventCardVariationByIndex(index())} />
            </li>
          )}
        </For>
      </ul>
    </Show>
  )
}
