import { For, Show } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { EventCard } from "./EventCard.tsx"
import type { EventItem } from "./EventItem.ts"

export function EventGrid(props: {
  events: readonly EventItem[]
  emptyMessage?: string
  eventHref?: (event: EventItem) => string
}) {
  return (
    <Show
      when={props.events.length > 0}
      fallback={
        <CardWrapper
          role="status"
          aria-live="polite"
          class="border-dashed border-border-strong bg-surface-muted p-space-7 text-center shadow-none"
        >
          {props.emptyMessage ?? "Keine Events gefunden. Passe deine Filter an."}
        </CardWrapper>
      }
    >
      <ul
        class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-space-4 gap-y-space-6 pt-7 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Eventliste"
      >
        <For each={props.events}>
          {(event) => (
            <li class="h-full">
              <EventCard event={event} href={props.eventHref?.(event)} />
            </li>
          )}
        </For>
      </ul>
    </Show>
  )
}
