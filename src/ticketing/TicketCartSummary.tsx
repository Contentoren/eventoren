import { For, Match, Show, Switch } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartSummaryStateCreate } from "./ticketCartSummaryStateCreate.ts"

export function TicketCartSummary(props: {
  event: EventItem
  cart: TicketCart
  minimumQuantity?: number
  checkoutLabel?: string
  onCheckout?: () => void
  onDirectCheckout?: () => void
  onCartChange?: (cart: TicketCart) => void
}) {
  const state = ticketCartSummaryStateCreate({
    event: () => props.event,
    cart: () => props.cart,
    minimumQuantity: () => props.minimumQuantity,
    onCartChange: props.onCartChange,
  })

  return (
    <UiCard>
      <section class="flex flex-col gap-space-5" aria-labelledby="ticket-cart-summary">
        <div class="flex items-center justify-between gap-space-2 border-b border-border-subtle pb-space-3">
          <h2 id="ticket-cart-summary" class="text-base font-semibold text-content">
            Bestellübersicht
          </h2>
          <span class="text-xs font-medium text-content-muted">{state.quantityLabel()}</span>
        </div>

        <div class="flex flex-col gap-space-4">
          <Show
            when={!state.isEmpty()}
            fallback={
              <div class="flex flex-col gap-space-2 rounded-control bg-surface-muted p-space-4 text-center">
                <p class="text-sm font-medium text-content">Noch keine Tickets gewählt</p>
                <p class="text-xs text-content-muted">Wähle deine gewünschten Tickets aus ({state.fromPriceLabel()})</p>
              </div>
            }
          >
            <dl class="flex flex-col gap-space-3">
              <For each={state.rows()}>
                {(row) => (
                  <div class="flex items-start justify-between gap-space-4">
                    <dt class="flex flex-col text-sm text-content-muted">
                      <span class="font-medium text-content">{row.name}</span>
                      <span class="text-xs text-content-muted">{row.unitPriceLabel}</span>
                    </dt>
                    <dd class="flex flex-col items-end gap-space-2 text-sm font-semibold text-content">
                      <span>{row.priceLabel}</span>
                      <Show when={state.canChangeCart()}>
                        <div class="flex items-center gap-space-2">
                          <button
                            type="button"
                            onClick={() => state.decreaseTier(row.id)}
                            disabled={!row.canDecrease}
                            aria-label={`Ein Ticket weniger für ${row.name}`}
                            class="focus-ring flex size-9 items-center justify-center rounded-control bg-surface-muted text-lg font-semibold text-content ring-1 ring-inset ring-border-strong transition-colors hover:text-content hover:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            −
                          </button>
                          <output
                            aria-live="polite"
                            aria-label={`${row.quantity} Tickets für ${row.name}`}
                            class="w-7 text-center text-base font-semibold text-content"
                          >
                            {row.quantity}
                          </output>
                          <button
                            type="button"
                            onClick={() => state.increaseTier(row.id)}
                            disabled={!row.canIncrease}
                            aria-label={`Ein Ticket mehr für ${row.name}`}
                            class="focus-ring flex size-9 items-center justify-center rounded-control bg-surface-muted text-lg font-semibold text-content ring-1 ring-inset ring-border-strong transition-colors hover:text-content hover:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            +
                          </button>
                        </div>
                      </Show>
                    </dd>
                  </div>
                )}
              </For>

              <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
                <dt class="text-sm text-content-muted">Zwischensumme</dt>
                <dd class="text-sm font-medium text-content">{state.subtotalLabel()}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-space-4">
                <dt class="text-sm text-content-muted">Service- & Vorverkaufsgebühren</dt>
                <dd class="text-sm font-medium text-content">{state.feeLabel()}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
                <dt class="text-base font-semibold text-content">Gesamtsumme (inkl. MwSt.)</dt>
                <dd class="text-base font-bold text-content">{state.totalLabel()}</dd>
              </div>
            </dl>

            <div class="flex items-center gap-2 rounded-control border border-border-subtle bg-surface-muted px-3 py-2 text-xs text-content-muted">
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
              <span>Garantierter Endpreis inklusive aller Gebühren</span>
            </div>
          </Show>
        </div>

        <div class="flex flex-col gap-space-3">
          <Show when={props.onCheckout}>
            {(onCheckout) => (
              <UiButton size="lg" block disabled={state.isCheckoutDisabled()} onClick={() => onCheckout()()}>
                {props.checkoutLabel ?? "In den Warenkorb"}
              </UiButton>
            )}
          </Show>

          <Show when={props.onDirectCheckout}>
            {(onDirectCheckout) => (
              <UiButton
                variant="secondary"
                size="lg"
                block
                disabled={state.isCheckoutDisabled()}
                onClick={() => onDirectCheckout()()}
              >
                Direkt zur Kasse
              </UiButton>
            )}
          </Show>
        </div>

        <div class="rounded-control border border-border-subtle bg-surface-muted/50 p-space-4">
          <ul class="flex flex-col gap-space-3" aria-label="Sicherheits- und Servicegarantien">
            <For each={state.trustBadges()}>
              {(badge) => (
                <li class="flex items-center gap-space-4 text-xs font-medium text-content">
                  <span
                    aria-hidden="true"
                    class="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand-accent/20 bg-brand-soft text-brand-accent shadow-xs"
                  >
                    <Switch>
                      <Match when={badge.id === "secure_payment"}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="size-3.5"
                        >
                          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </Match>
                      <Match when={badge.id === "instant_delivery"}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="size-3.5"
                        >
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </Match>
                      <Match when={badge.id === "original_tickets"}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="size-3.5"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </Match>
                    </Switch>
                  </span>
                  <span class="leading-snug">{badge.label}</span>
                </li>
              )}
            </For>
          </ul>
        </div>
      </section>
    </UiCard>
  )
}
