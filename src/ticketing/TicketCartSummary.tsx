import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { ticketCartSummaryStateCreate } from "./ticketCartSummaryStateCreate.ts"
import { ticketCheckoutText } from "./ticketCheckoutText.ts"

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
  const text = ticketCheckoutText

  return (
    <UiCard>
      <section class="flex flex-col gap-space-5" aria-labelledby={state.headingId}>
        <div class="flex items-center justify-between gap-space-2 border-b border-border-subtle pb-space-3">
          <h2 id={state.headingId} class="text-base font-semibold text-content">
            {text().orderSummary}
          </h2>
          <span class="text-xs font-medium text-content-muted">{state.quantityLabel()}</span>
        </div>

        <div class="flex flex-col gap-space-4">
          <Show
            when={!state.isEmpty()}
            fallback={
              <div class="flex flex-col gap-space-2 rounded-control bg-surface-muted p-space-4 text-center">
                <p class="text-sm font-medium text-content">{text().noTicketsSelected}</p>
                <p class="text-xs text-content-muted">
                  {text().chooseTickets} ({state.fromPriceLabel()})
                </p>
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
                          <Button
                            variant="none"
                            size="none"
                            type="button"
                            onClick={() => state.decreaseTier(row.id)}
                            disabled={!row.canDecrease}
                            aria-label={`${text().decreaseTicket} ${row.name}`}
                            class="focus-ring flex size-9 items-center justify-center rounded-control bg-surface-muted text-lg font-semibold text-content ring-1 ring-inset ring-border-strong transition-colors hover:text-content hover:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            −
                          </Button>
                          <output
                            aria-live="polite"
                            aria-label={`${row.quantity} ${text().tickets} für ${row.name}`}
                            class="w-7 text-center text-base font-semibold text-content"
                          >
                            {row.quantity}
                          </output>
                          <Button
                            variant="none"
                            size="none"
                            type="button"
                            onClick={() => state.increaseTier(row.id)}
                            disabled={!row.canIncrease}
                            aria-label={`${text().increaseTicket} ${row.name}`}
                            class="focus-ring flex size-9 items-center justify-center rounded-control bg-surface-muted text-lg font-semibold text-content ring-1 ring-inset ring-border-strong transition-colors hover:text-content hover:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            +
                          </Button>
                        </div>
                      </Show>
                    </dd>
                  </div>
                )}
              </For>

              <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
                <dt class="text-sm text-content-muted">{text().subtotal}</dt>
                <dd class="text-sm font-medium text-content">{state.subtotalLabel()}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-space-4">
                <dt class="text-sm text-content-muted">{text().fees}</dt>
                <dd class="text-sm font-medium text-content">{state.feeLabel()}</dd>
              </div>
              <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
                <dt class="text-base font-semibold text-content">{text().total}</dt>
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
              <span>{text().feesIncluded}</span>
            </div>
          </Show>
        </div>

        <div class="flex flex-col gap-space-3">
          <Show when={props.onCheckout}>
            {(onCheckout) => (
              <UiButton size="lg" block disabled={state.isCheckoutDisabled()} onClick={() => onCheckout()()}>
                {props.checkoutLabel ?? text().addToCart}
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
                {text().directCheckout}
              </UiButton>
            )}
          </Show>
        </div>

        <div class="flex flex-col gap-space-3 rounded-control border border-border-subtle bg-surface-muted/50 p-space-4">
          <p class="text-xs font-medium text-content">{text().paymentMethods}</p>
          <ul class="flex flex-wrap items-center gap-space-3" aria-label={text().supportedPaymentMethods}>
            <li>
              <img src="/payment-visa.svg" alt="Visa" class="h-10 w-auto" />
            </li>
            <li>
              <img src="/payment-mastercard.svg" alt="Mastercard" class="h-10 w-auto" />
            </li>
            <li>
              <img src="/payment-american-express.svg" alt="American Express" class="h-10 w-auto" />
            </li>
            <li>
              <img src="/payment-discover.svg" alt="Discover" class="h-10 w-auto" />
            </li>
            <li>
              <img src="/payment-paypal.svg" alt="PayPal" class="h-10 w-auto" />
            </li>
            <li>
              <img src="/payment-klarna.svg" alt="Klarna" class="h-10 w-auto" />
            </li>
          </ul>
        </div>
      </section>
    </UiCard>
  )
}
