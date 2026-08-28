import type { EventItem } from "../events/EventItem.ts"
import { UiButton } from "../ui/UiButton.tsx"
import type { TicketCart } from "./TicketCart.ts"
import { ticketStickyCtaStateCreate } from "./ticketStickyCtaStateCreate.ts"

export function TicketStickyCta(props: { event: EventItem; cart: TicketCart; label?: string; onContinue: () => void }) {
  const state = ticketStickyCtaStateCreate({ event: () => props.event, cart: () => props.cart })

  return (
    <section
      class="sticky bottom-0 z-20 border-t border-border-strong bg-surface-base/90 px-space-6 py-space-4 backdrop-blur-xl lg:hidden"
      aria-label="Ticketauswahl fortsetzen"
    >
      <div class="mx-auto flex max-w-6xl flex-col gap-space-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-content">{state.quantityLabel()}</p>
          <p class="text-sm text-content-muted">{state.totalLabel()}</p>
        </div>
        <UiButton size="lg" disabled={state.isDisabled()} onClick={() => props.onContinue()}>
          {props.label ?? "Weiter zur Kasse"}
        </UiButton>
      </div>
    </section>
  )
}
