import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventCardStateCreate } from "./eventCardStateCreate.ts"

/** Variation A: editorial hero photo, glass overlay panel, outlined ghost CTA. */
export function EventCardGlass(props: { event: EventItem }) {
  const state = eventCardStateCreate({ event: () => props.event })

  return (
    <article class="group relative h-full overflow-hidden rounded-card border border-border-subtle bg-surface-inverted shadow-sm transition-all duration-200 hover:border-brand-accent">
      <Link
        to="/events/$eventId"
        params={{ eventId: props.event.id }}
        class="focus-ring flex h-full min-h-[21rem] flex-col justify-end"
      >
        <img
          src={props.event.imageUrl}
          alt={props.event.imageAlt}
          loading="lazy"
          width="1200"
          height="750"
          class="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Dark fade keeps the overlaid copy readable on any photo. */}
        <div
          aria-hidden="true"
          class="absolute inset-0 bg-linear-to-t from-surface-inverted via-surface-inverted/70 to-surface-inverted/10"
        />

        <div class="relative flex flex-wrap gap-space-2 p-space-4">
          <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
          <Show when={props.event.soldOut}>
            <UiBadge tone="danger">Ausverkauft</UiBadge>
          </Show>
          <Show when={state.isScarce()}>
            <UiBadge tone="warning">Nur noch {state.availableCount()} Tickets</UiBadge>
          </Show>
        </div>

        <div class="relative mt-auto p-space-4 pt-0">
          <div class="rounded-card border border-white/15 bg-white/10 p-space-4 backdrop-blur-md">
            <p class="text-sm font-semibold uppercase tracking-wide text-white/80">
              {state.dateLabel()} · {state.timeLabel()}
            </p>
            <h3 class="mt-space-1 text-xl font-bold leading-tight tracking-tight text-white">{props.event.title}</h3>
            <p class="mt-space-1 line-clamp-2 text-sm text-white/80">{props.event.subtitle}</p>
            <p class="mt-space-2 text-sm text-white/70">{state.locationLabel()}</p>

            <div class="mt-space-3 flex items-center justify-between gap-space-3 border-t border-white/20 pt-space-3">
              <p class="text-base font-bold text-white">{state.priceLabel()}</p>
              <span
                data-testid="module-content-list-item-cta"
                class="inline-flex h-10 items-center justify-center rounded-control border border-white/60 px-4 text-sm font-bold text-white transition-colors group-hover:bg-white group-hover:text-content"
              >
                Details ansehen
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  )
}
