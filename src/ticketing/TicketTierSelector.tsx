import { For, Show } from "solid-js"
import type { EventItem } from "../events/EventItem.ts"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { ticketTierSelectorStateCreate } from "./ticketTierSelectorStateCreate.ts"

export function TicketTierSelector(props: {
  event: EventItem
  cart: TicketCart
  onCartChange: (cart: TicketCart) => void
}) {
  const state = ticketTierSelectorStateCreate({
    event: () => props.event,
    cart: () => props.cart,
    onCartChange: (cart) => props.onCartChange(cart),
  })

  return (
    <section class="flex flex-col gap-space-4" aria-labelledby="ticket-tier-selector">
      <h2 id="ticket-tier-selector" class="text-xl font-semibold text-content">
        Tickets auswählen
      </h2>

      <ul class="flex flex-col gap-space-4">
        <For each={state.rows()}>
          {(row) => (
            <li>
              <UiCard>
                <div class="flex flex-col gap-space-4 sm:flex-row sm:items-start sm:justify-between">
                  <div class="flex flex-col gap-space-2">
                    <p class="text-base font-semibold text-content">{row.name}</p>
                    <p class="text-sm text-content-muted">{row.description}</p>
                    <Show when={row.soldOut}>
                      <UiBadge tone="danger">Ausverkauft</UiBadge>
                    </Show>
                  </div>

                  <div class="flex flex-col items-start gap-space-3 sm:items-end">
                    <div class="sm:text-right">
                      <p class="text-lg font-semibold text-content">{row.priceLabel}</p>
                      <p class="text-sm text-content-muted">{row.totalLabel}</p>
                    </div>

                    <div class="flex items-center gap-space-3">
                      <button
                        type="button"
                        onClick={() => state.decreaseTier(row.id)}
                        disabled={!row.canDecrease}
                        aria-label={`Ein Ticket weniger für ${row.name}`}
                        class="focus-ring flex size-10 items-center justify-center rounded-control bg-surface-muted text-lg font-semibold text-content ring-1 ring-inset ring-border-strong transition-colors hover:text-content hover:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        −
                      </button>
                      <output
                        aria-live="polite"
                        aria-label={`${row.quantity} Tickets für ${row.name}`}
                        class="w-8 text-center text-base font-semibold text-content"
                      >
                        {row.quantity}
                      </output>
                      <button
                        type="button"
                        onClick={() => state.increaseTier(row.id)}
                        disabled={!row.canIncrease}
                        aria-label={`Ein Ticket mehr für ${row.name}`}
                        class="focus-ring flex size-10 items-center justify-center rounded-control bg-brand text-lg font-semibold text-brand-content transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </UiCard>
            </li>
          )}
        </For>
      </ul>

      <p class="text-sm text-content-muted">{state.hintLabel()}</p>
      <p class="sr-only" aria-live="polite">
        {state.selectionLabel()}
      </p>
    </section>
  )
}
