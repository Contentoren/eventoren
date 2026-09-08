import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { classArr } from "../ui/classArr.ts"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventCardStateCreate } from "./eventCardStateCreate.ts"

/** Variation B: ticket stub with date block, perforation line and solid primary CTA. */
export function EventCardTicket(props: { event: EventItem }) {
  const state = eventCardStateCreate({ event: () => props.event })

  return (
    <article class="group relative h-full overflow-hidden rounded-card border-2 border-border-strong bg-surface shadow-sm transition-all duration-200 hover:border-brand hover:shadow-md">
      <Link to="/events/$eventId" params={{ eventId: props.event.id }} class="focus-ring flex h-full flex-col">
        {/* Taller vertical image aspect ratio */}
        <div class="relative aspect-[4/3] overflow-hidden bg-surface-muted">
          <img
            src={props.event.imageUrl}
            alt={props.event.imageAlt}
            loading="lazy"
            width="1200"
            height="900"
            class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div aria-hidden="true" class="absolute inset-0 bg-linear-to-t from-black/60 via-black/15 to-transparent" />

          {/* Badges positioned bottom-left over image */}
          <div class="absolute bottom-space-3 left-space-4 right-space-4 flex flex-wrap gap-space-2">
            <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
            <Show when={props.event.soldOut}>
              <UiBadge tone="danger">Ausverkauft</UiBadge>
            </Show>
          </div>
        </div>

        {/* Content section with generous gap */}
        <div class="flex items-start gap-space-5 p-space-4">
          {/* Stub date block */}
          <div class="flex w-14 shrink-0 flex-col items-center rounded-control bg-brand py-space-2 text-brand-content">
            <span class="text-xs font-bold uppercase tracking-wide opacity-90">{state.dateParts().weekday}</span>
            <span class="my-0.5 text-xl font-black leading-none">{state.dateParts().day}</span>
            <span class="text-xs font-bold uppercase tracking-wide opacity-90">{state.dateParts().month}</span>
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-space-1.5">
            <h3 class="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-content transition-colors group-hover:text-brand-accent sm:text-lg">
              {props.event.title}
            </h3>
            <p class="text-sm text-content-muted sm:text-sm">
              {state.timeLabel()} · {state.locationLabel()}
            </p>
          </div>
        </div>

        {/* Perforation: dashed rule kept flush inside the rectangle */}
        <div aria-hidden="true" class="mt-auto px-space-4">
          <div class="border-t border-dashed border-border-subtle" />
        </div>

        {/* Footer row with generous spacing and comfortable button */}
        <div class="flex items-center justify-between gap-space-3 p-space-4">
          <p class="text-base font-bold text-content">{state.priceLabel()}</p>
          <span
            data-testid="module-content-list-item-cta"
            class={classArr(
              "inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-bold shadow-sm transition-colors",
              props.event.soldOut
                ? "border border-border-strong bg-surface-muted text-content-muted"
                : "bg-brand text-brand-content group-hover:bg-brand-strong",
            )}
          >
            {props.event.soldOut ? "Ausverkauft" : "Tickets kaufen"}
          </span>
        </div>
      </Link>
    </article>
  )
}
