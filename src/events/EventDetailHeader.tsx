import { Show } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventDetailHeaderStateCreate } from "./eventDetailHeaderStateCreate.ts"

export function EventDetailHeader(props: { event: EventItem }) {
  const state = eventDetailHeaderStateCreate({ event: () => props.event })

  return (
    <header class="flex flex-col gap-space-4">
      <div class="flex flex-wrap items-center gap-space-2">
        <UiBadge tone="brand">{state.categoryLabel()}</UiBadge>
        <Show when={state.isSoldOut()}>
          <UiBadge tone="danger">Ausverkauft</UiBadge>
        </Show>
        <Show when={state.isScarce()}>
          <UiBadge tone="warning">{state.scarcityLabel()}</UiBadge>
        </Show>
      </div>

      <div class="flex flex-col gap-space-2">
        <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">{props.event.title}</h1>
        <Show when={props.event.subtitle}>
          <p class="text-base text-content-muted">{props.event.subtitle}</p>
        </Show>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 my-4 py-4 border-y border-border-subtle">
        <div class="flex items-center gap-3">
          <div
            class="size-9 shrink-0 flex items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-content-muted">Datum</span>
            <span class="text-sm sm:text-base font-bold text-content">{state.dateFormatted()}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="size-9 shrink-0 flex items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-content-muted">Uhrzeit & Einlass</span>
            <span class="text-sm sm:text-base font-bold text-content">{state.timeFormatted()}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="size-9 shrink-0 flex items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-content-muted">Veranstaltungsort</span>
            <span class="text-sm sm:text-base font-bold text-content">{state.locationFormatted()}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="size-9 shrink-0 flex items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2" />
              <path d="M13 11v2" />
              <path d="M13 17v2" />
            </svg>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-content-muted">Tickets & Verfügbarkeit</span>
            <span class="text-sm sm:text-base font-bold text-content">{state.ticketAvailabilityFormatted()}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
