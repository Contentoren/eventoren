import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventCardStateCreate } from "./eventCardStateCreate.ts"

export function EventCard(props: { event: EventItem }) {
  const state = eventCardStateCreate({ event: () => props.event })

  return (
    <article class="group relative flex h-full flex-col rounded-card overflow-hidden border border-border-subtle bg-surface transition-all duration-200 hover:border-border-strong">
      <Link to="/events/$eventId" params={{ eventId: props.event.id }} class="focus-ring flex h-full flex-col">
        <div class="relative aspect-[16/10] overflow-hidden bg-surface-muted">
          <img
            src={props.event.imageUrl}
            alt={props.event.imageAlt}
            loading="lazy"
            width="1200"
            height="750"
            class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Scrim: keeps badges readable regardless of how bright the photo is. */}
          <div
            aria-hidden="true"
            class="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-surface-base/85 to-transparent"
          />
          {/* Fade into the card body so the image edge never cuts hard. */}
          <div aria-hidden="true" class="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-surface to-transparent" />
          <div class="absolute left-space-4 top-space-4 flex flex-wrap gap-space-2 text-sm font-semibold">
            <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
            <Show when={props.event.soldOut}>
              <UiBadge tone="danger">Ausverkauft</UiBadge>
            </Show>
            <Show when={state.isScarce()}>
              <UiBadge tone="warning">Nur noch {state.availableCount()} Tickets</UiBadge>
            </Show>
          </div>
        </div>

        <div class="flex flex-1 flex-col justify-between gap-space-3 bg-surface p-space-5">
          <div class="flex flex-col gap-space-2">
            <p class="text-sm font-medium text-content-muted">
              {state.dateLabel()} · {state.locationLabel()}
            </p>
            <h3 class="text-xl sm:text-2xl font-bold tracking-tight text-content group-hover:text-brand-accent transition-colors">
              {props.event.title}
            </h3>
          </div>

          <div class="mt-space-4 flex items-center justify-between gap-space-4 border-t border-border-subtle pt-space-4">
            <p class="text-sm sm:text-base font-bold text-content">{state.priceLabel()}</p>
            <span
              data-testid="module-content-list-item-cta"
              class="inline-flex h-11 items-center justify-center rounded-control bg-brand px-6 text-sm sm:text-base font-bold text-brand-content shadow-sm transition-all group-hover:bg-brand-strong"
            >
              Tickets kaufen
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}
