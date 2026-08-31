import { For, Match, Show, Switch } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartSummaryStateCreate } from "./ticketCartSummaryStateCreate.ts"

export function TicketCartSummary(props: {
  event: EventItem
  cart: TicketCart
  checkoutLabel?: string
  onCheckout?: () => void
}) {
  const state = ticketCartSummaryStateCreate({ event: () => props.event, cart: () => props.cart })

  return (
    <UiCard>
      <section class="flex flex-col gap-space-5" aria-labelledby="ticket-cart-summary">
        <div class="flex flex-col gap-space-1">
          <h2 id="ticket-cart-summary" class="text-lg font-semibold text-content">
            {state.title()}
          </h2>
          <p class="text-sm text-content-muted">{state.dateLabel()}</p>
          <p class="text-sm text-content-muted">{state.locationLabel()}</p>
        </div>

        <div class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-4">
          <p class="text-sm font-medium text-content">{state.quantityLabel()}</p>

          <Show
            when={!state.isEmpty()}
            fallback={
              <div class="flex items-baseline justify-between gap-space-4">
                <span class="text-sm text-content-muted">Tickets</span>
                <span class="text-base font-semibold text-content">{state.fromPriceLabel()}</span>
              </div>
            }
          >
            <div class="flex flex-col gap-space-3">
              <dl class="flex flex-col gap-space-3">
                <For each={state.rows()}>
                  {(row) => (
                    <div class="flex items-baseline justify-between gap-space-4">
                      <dt class="flex flex-col text-sm text-content-muted">
                        <span class="text-content">{row.label}</span>
                        <span>{row.unitPriceLabel}</span>
                      </dt>
                      <dd class="text-sm font-medium text-content">{row.priceLabel}</dd>
                    </div>
                  )}
                </For>

                <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
                  <dt class="text-sm text-content-muted">Grundpreis (Zwischensumme)</dt>
                  <dd class="text-sm font-medium text-content">{state.subtotalLabel()}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-space-4">
                  <dt class="text-sm text-content-muted">Vorverkaufsgebühren / Servicegebühren</dt>
                  <dd class="text-sm font-medium text-content">{state.feeLabel()}</dd>
                </div>
                <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
                  <dt class="text-base font-semibold text-content">Gesamtbetrag (inkl. MwSt.)</dt>
                  <dd class="text-base font-semibold text-content">{state.totalLabel()}</dd>
                </div>
              </dl>

              <div class="flex items-center gap-2 rounded-control border border-border-subtle bg-surface-muted p-3 text-sm text-content-muted">
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  class="size-4 shrink-0 text-brand dark:text-brand-accent"
                >
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .247.25v3.5a.75.75 0 0 0 1.5 0v-3.75A1.75 1.75 0 0 0 9.253 9H9Z"
                    clip-rule="evenodd"
                  />
                </svg>
                <span>Endpreis inkl. aller Gebühren – keine Überraschungen an der Kasse</span>
              </div>
            </div>
          </Show>
        </div>

        <Show when={props.onCheckout}>
          {(onCheckout) => (
            <UiButton size="lg" block disabled={state.isCheckoutDisabled()} onClick={() => onCheckout()()}>
              {props.checkoutLabel ?? "Weiter zur Kasse"}
            </UiButton>
          )}
        </Show>

        <ul class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-4">
          <For each={state.trustBadges()}>
            {(badge) => (
              <li class="flex items-center gap-space-3 text-sm font-semibold text-content">
                <span aria-hidden="true" class="shrink-0 text-brand dark:text-brand-accent">
                  <Switch>
                    <Match when={badge.id === "verified"}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-5"
                        aria-hidden="true"
                      >
                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </Match>
                    <Match when={badge.id === "wallet"}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-5"
                        aria-hidden="true"
                      >
                        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
                        <path d="M9.5 7h5v5h-5z" />
                        <path d="M9.5 15h2M14.5 15h.01M9.5 17.5h5" />
                      </svg>
                    </Match>
                    <Match when={badge.id === "protection"}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-5"
                        aria-hidden="true"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </Match>
                  </Switch>
                </span>
                <span>{badge.label}</span>
              </li>
            )}
          </For>
        </ul>
      </section>
    </UiCard>
  )
}
