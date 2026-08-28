import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventCardStateCreate } from "./eventCardStateCreate.ts"

export function EventCard(props: { event: EventItem }) {
  const state = eventCardStateCreate({ event: () => props.event })

  return (
    <article class="group relative flex h-full flex-col overflow-hidden rounded-card border border-border-strong bg-surface text-content shadow-lg shadow-black/30 transition-colors duration-200 focus-within:border-brand-accent hover:border-brand-accent">
      <div class="relative aspect-[16/9] overflow-hidden bg-surface-muted">
        <img
          src={props.event.imageUrl}
          alt={props.event.imageAlt}
          loading="lazy"
          width="1200"
          height="630"
          class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Scrim: keeps badges readable regardless of how bright the photo is. */}
        <div
          aria-hidden="true"
          class="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-surface-base/85 to-transparent"
        />
        {/* Fade into the card body so the image edge never cuts hard. */}
        <div aria-hidden="true" class="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface to-transparent" />
        <div class="absolute left-space-4 top-space-4 flex flex-wrap gap-space-2">
          <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
          <Show when={props.event.soldOut}>
            <UiBadge tone="danger">Ausverkauft</UiBadge>
          </Show>
          <Show when={state.isScarce()}>
            <UiBadge tone="warning">Nur noch {state.availableCount()} Tickets</UiBadge>
          </Show>
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-space-3 p-space-6">
        <p class="text-sm font-medium text-content-muted">
          {state.dateLabel()} · {state.timeLabel()}
        </p>
        <h3 class="text-lg font-semibold leading-snug text-content">
          <Link
            to="/events/$eventId"
            params={{ eventId: props.event.id }}
            class="focus-ring rounded-control transition-colors after:absolute after:inset-0 hover:text-brand-accent"
          >
            {props.event.title}
          </Link>
        </h3>
        <p class="text-sm text-content-muted">{props.event.subtitle}</p>
        <p class="text-sm text-content-muted">{state.locationLabel()}</p>

        <ul class="mt-auto flex flex-wrap gap-space-2 pt-space-4" aria-label="Merkmale">
          <For each={props.event.tags}>
            {(tag) => (
              <li>
                <UiBadge>{tag}</UiBadge>
              </li>
            )}
          </For>
        </ul>

        <p class="border-t border-border-subtle pt-space-4 text-base font-bold tracking-tight text-content">
          {state.priceLabel()}
        </p>
      </div>
    </article>
  )
}
