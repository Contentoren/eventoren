import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventCardStateCreate } from "./eventCardStateCreate.ts"

/** Variation C: poster crop with a floating date medallion, glow accent frame and an arrow CTA. */
export function EventCardPoster(props: { event: EventItem }) {
  const state = eventCardStateCreate({ event: () => props.event })

  return (
    <article class="group relative h-full rounded-card">
      {/* Neon accent halo that lights up behind the whole poster on hover. */}
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -inset-px rounded-card bg-linear-to-br from-brand via-brand-accent to-brand-soft opacity-0 blur-[6px] transition-opacity duration-300 group-hover:opacity-70"
      />

      <div class="relative flex h-full flex-col overflow-hidden rounded-card border-2 border-border-strong bg-surface shadow-sm transition-shadow duration-300 group-hover:shadow-lg">
        <Link to="/events/$eventId" params={{ eventId: props.event.id }} class="focus-ring flex h-full flex-col">
          {/* Wide poster crop, rectangular and compact. */}
          <div class="relative aspect-16/10 overflow-hidden bg-surface-inverted">
            <img
              src={props.event.imageUrl}
              alt={props.event.imageAlt}
              loading="lazy"
              width="1200"
              height="750"
              class="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              class="absolute inset-0 bg-linear-to-t from-surface-inverted/90 via-surface-inverted/20 to-transparent"
            />

            <div class="absolute bottom-space-3 left-space-4 right-space-4 flex flex-wrap gap-space-2">
              <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
              <Show when={props.event.soldOut}>
                <UiBadge tone="danger">Ausverkauft</UiBadge>
              </Show>
              <Show when={state.isScarce()}>
                <UiBadge tone="warning">Nur noch {state.availableCount()} Tickets</UiBadge>
              </Show>
            </div>
          </div>

          {/* Date block: rectangular accent chip inside the card, no circular protrusion. */}
          <div class="flex items-start gap-space-3 p-space-4 pb-0">
            <div class="flex shrink-0 items-baseline gap-space-1 rounded-control bg-surface-inverted px-space-3 py-space-1 text-white transition-colors duration-300 group-hover:bg-brand">
              <span class="text-[0.625rem] font-bold uppercase tracking-widest opacity-80">
                {state.dateParts().weekday}
              </span>
              <span class="text-base font-black leading-none">{state.dateParts().day}</span>
              <span class="text-[0.625rem] font-bold uppercase tracking-widest opacity-80">
                {state.dateParts().month}
              </span>
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-space-2 p-space-4 pt-space-2">
            <h3 class="text-xl font-black leading-[1.1] tracking-tight text-content transition-colors group-hover:text-brand-accent">
              {props.event.title}
            </h3>
            <p class="line-clamp-2 text-sm leading-relaxed text-content-muted">{props.event.subtitle}</p>
          </div>

          <div class="flex flex-wrap items-center gap-space-2 px-space-4 text-xs">
            <span class="inline-flex items-center gap-space-1 rounded-full border border-border-subtle px-3 py-1 font-semibold text-content">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="size-3.5 text-brand-accent"
              >
                <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {state.locationLabel()}
            </span>
            <span class="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand-accent">
              {state.timeLabel()}
            </span>
            <For each={state.topTags()}>
              {(tag) => (
                <span class="rounded-full bg-surface-muted px-3 py-1 font-medium text-content-muted">{tag}</span>
              )}
            </For>
          </div>

          <div class="mt-auto flex items-center justify-between gap-space-3 p-space-4">
            <div>
              <span class="block text-[0.625rem] font-bold uppercase tracking-widest text-content-muted">
                Tickets ab
              </span>
              <span class="block text-base font-black text-content">{state.priceValueLabel()}</span>
            </div>
            <span
              data-testid="module-content-list-item-cta"
              class="inline-flex h-10 items-center gap-space-2 rounded-control border-2 border-content px-4 text-sm font-bold text-content transition-colors duration-200 group-hover:border-brand group-hover:bg-brand group-hover:text-brand-content"
            >
              Jetzt entdecken
              <span aria-hidden="true" class="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </span>
          </div>
        </Link>
      </div>
    </article>
  )
}
