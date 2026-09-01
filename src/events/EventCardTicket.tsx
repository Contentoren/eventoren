import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventCardStateCreate } from "./eventCardStateCreate.ts"

/** Variation B: ticket stub with date block, perforation line and solid primary CTA. */
export function EventCardTicket(props: { event: EventItem }) {
  const state = eventCardStateCreate({ event: () => props.event })

  return (
    <div class="relative h-full">
      {/* Favourite marker floats above the card's top edge without affecting its box. */}
      <div class="pointer-events-none absolute -top-6 left-0 flex items-center gap-space-1 text-xs font-bold uppercase tracking-wider text-brand-accent">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" class="size-3.5">
          <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L12 3.5Z" />
        </svg>
        Favorite
      </div>

      <article class="group relative h-full overflow-hidden rounded-card border-2 border-border-strong bg-surface shadow-sm transition-all duration-200 hover:border-brand hover:shadow-md">
        <Link to="/events/$eventId" params={{ eventId: props.event.id }} class="focus-ring flex h-full flex-col">
          <div class="relative aspect-[16/9] overflow-hidden bg-surface-muted">
            <img
              src={props.event.imageUrl}
              alt={props.event.imageAlt}
              loading="lazy"
              width="1200"
              height="675"
              class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div class="flex items-start gap-space-3 p-space-4">
            {/* Stub date block, the loud anchor of this design. */}
            <div class="flex w-14 shrink-0 flex-col items-center rounded-control bg-brand py-space-2 text-brand-content">
              <span class="text-xs font-bold uppercase tracking-wide opacity-90">{state.dateParts().weekday}</span>
              <span class="text-xl font-black leading-none">{state.dateParts().day}</span>
              <span class="text-xs font-bold uppercase tracking-wide opacity-90">{state.dateParts().month}</span>
            </div>

            <div class="flex min-w-0 flex-col gap-space-2">
              <div class="flex flex-wrap gap-space-2">
                <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
                <Show when={props.event.soldOut}>
                  <UiBadge tone="danger">Ausverkauft</UiBadge>
                </Show>
                <Show when={state.isScarce()}>
                  <UiBadge tone="warning">Nur noch {state.availableCount()} Tickets</UiBadge>
                </Show>
              </div>
              <h3 class="text-lg font-bold leading-tight tracking-tight text-content transition-colors group-hover:text-brand-accent">
                {props.event.title}
              </h3>
              <p class="text-sm text-content-muted">
                {state.timeLabel()} · {state.locationLabel()}
              </p>
            </div>
          </div>

          {/* Perforation: dashed rule kept flush inside the rectangle, no protruding notches. */}
          <div aria-hidden="true" class="mt-auto px-space-4">
            <div class="border-t-2 border-dashed border-border-subtle" />
          </div>

          <div class="flex items-center justify-between gap-space-3 p-space-4">
            <div class="rounded-control bg-brand-soft px-space-3 py-space-2 ring-1 ring-inset ring-brand-accent/50">
              <span class="block text-xs font-semibold uppercase tracking-wide text-brand-accent/80">Ticket ab</span>
              <span class="block text-base font-black text-brand-accent">{state.priceValueLabel()}</span>
            </div>
            <span
              data-testid="module-content-list-item-cta"
              class="inline-flex h-10 items-center justify-center rounded-control bg-brand px-4 text-sm font-bold text-brand-content shadow-sm transition-colors group-hover:bg-brand-strong"
            >
              Tickets kaufen
            </span>
          </div>
        </Link>
      </article>
    </div>
  )
}
