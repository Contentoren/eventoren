import { For, Show } from "solid-js"
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
                <dt class="text-sm text-content-muted">Zwischensumme</dt>
                <dd class="text-sm font-medium text-content">{state.subtotalLabel()}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-space-4">
                <dt class="text-sm text-content-muted">Service- & Buchungsgebühr</dt>
                <dd class="text-sm font-medium text-content">{state.feeLabel()}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
                <dt class="text-base font-semibold text-content">Gesamt inkl. MwSt.</dt>
                <dd class="text-base font-semibold text-content">{state.totalLabel()}</dd>
              </div>
            </dl>
          </Show>
        </div>

        <Show when={props.onCheckout}>
          {(onCheckout) => (
            <UiButton size="lg" block disabled={state.isCheckoutDisabled()} onClick={() => onCheckout()()}>
              {props.checkoutLabel ?? "Weiter zur Kasse"}
            </UiButton>
          )}
        </Show>

        <ul class="flex flex-col gap-space-2 border-t border-border-subtle pt-space-4">
          <For each={state.trustBadges()}>
            {(badge) => (
              <li class="flex items-center gap-space-2 text-sm text-content-muted">
                <span aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-brand-accent" />
                {badge}
              </li>
            )}
          </For>
        </ul>
      </section>
    </UiCard>
  )
}
