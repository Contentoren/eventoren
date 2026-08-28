import { Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventDetailHeaderStateCreate } from "./eventDetailHeaderStateCreate.ts"

export function EventDetailHeader(props: { event: EventItem }) {
  const state = eventDetailHeaderStateCreate({ event: () => props.event })

  return (
    <header class="flex flex-col gap-space-6">
      <div class="overflow-hidden rounded-card bg-surface-muted">
        <img
          src={props.event.imageUrl}
          alt={props.event.imageAlt}
          width="1200"
          height="630"
          class="aspect-[16/9] w-full object-cover"
        />
      </div>

      <div class="flex flex-wrap items-center gap-space-2">
        <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
        <Show when={props.event.soldOut} fallback={<UiBadge tone="success">Tickets verfügbar</UiBadge>}>
          <UiBadge tone="danger">Ausverkauft</UiBadge>
        </Show>
      </div>

      <div class="flex flex-col gap-space-3">
        <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">{props.event.title}</h1>
        <p class="text-base text-content-muted">{props.event.subtitle}</p>
      </div>

      <dl class="grid grid-cols-1 gap-space-4 sm:grid-cols-3">
        <div>
          <dt class="text-sm text-content-muted">Datum</dt>
          <dd class="text-sm font-semibold text-content">{state.dateLabel()}</dd>
        </div>
        <div>
          <dt class="text-sm text-content-muted">Beginn</dt>
          <dd class="text-sm font-semibold text-content">
            {state.timeLabel()} · {state.doorsLabel()}
          </dd>
        </div>
        <div>
          <dt class="text-sm text-content-muted">Ort</dt>
          <dd class="text-sm font-semibold text-content">{state.locationLabel()}</dd>
        </div>
      </dl>

      <p class="text-lg font-semibold text-content">{state.priceLabel()}</p>
    </header>
  )
}
