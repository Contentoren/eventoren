import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { UiPopover } from "../ui/UiPopover.tsx"

export function SiteHeaderCartButton(props: {
  open: boolean
  quantity: number
  label: string
  hasItems: boolean
  eventId: string
  onToggle: () => void
  onClose: () => void
  class?: string
}) {
  return (
    <UiPopover
      open={props.open}
      onClose={() => props.onClose()}
      label="Warenkorb"
      trigger={(api) => (
        <button
          type="button"
          onClick={() => props.onToggle()}
          aria-haspopup="dialog"
          aria-expanded={props.open}
          aria-controls={api.panelId}
          aria-label={props.label}
          class={`focus-ring relative inline-flex h-10 items-center gap-space-2 rounded-control px-space-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted ${props.class ?? ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5" fill="none" stroke="currentColor">
            <path
              d="M4 5h2l1.6 9.2a2 2 0 002 1.8h6.9a2 2 0 002-1.7L20 8H7"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="10" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="17" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
          <span class="hidden lg:inline">Warenkorb</span>
          <Show when={props.hasItems}>
            <span
              aria-hidden="true"
              class="absolute -right-space-1 -top-space-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-space-1 text-[0.625rem] font-bold leading-5 text-brand-content"
            >
              {props.quantity}
            </span>
          </Show>
        </button>
      )}
    >
      <p class="text-xs font-semibold uppercase tracking-widest text-content-muted">Dein Warenkorb</p>

      <Show
        when={props.hasItems}
        fallback={
          <p class="mt-space-4 text-sm leading-relaxed text-content-muted">
            Noch keine Tickets ausgewählt. Entdecke Events und lege deine Tickets in den Warenkorb.
          </p>
        }
      >
        <p class="mt-space-4 text-sm leading-relaxed text-content">
          <span class="font-semibold">{props.quantity}</span> {props.quantity === 1 ? "Ticket" : "Tickets"} für dein
          zuletzt gewähltes Event liegen bereit.
        </p>
      </Show>

      <div class="mt-space-5 flex flex-col gap-space-2">
        <Show when={props.hasItems && props.eventId.length > 0}>
          <Link
            to="/events/$eventId"
            params={{ eventId: props.eventId }}
            onClick={() => props.onClose()}
            class="focus-ring flex h-11 items-center justify-center rounded-control bg-brand px-space-5 text-sm font-semibold text-brand-content transition-colors hover:bg-brand-strong"
          >
            Auswahl fortsetzen
          </Link>
        </Show>

        <Link
          to="/"
          onClick={() => props.onClose()}
          class="focus-ring flex h-11 items-center justify-center rounded-control bg-surface-muted px-space-5 text-sm font-semibold text-content ring-1 ring-inset ring-border-strong transition-colors hover:ring-brand-accent"
        >
          Events entdecken
        </Link>
      </div>
    </UiPopover>
  )
}
