import { UiButton } from "../ui/UiButton.tsx"
import { TicketBagPaymentMethods } from "./TicketBagPaymentMethods.tsx"
import type { EventItem } from "../events/EventItem.ts"

export function TicketBagSummary(props: {
  subtotalLabel: string
  feeLabel: string
  totalLabel: string
  quantity: number
  onCheckout: () => void
  events: readonly EventItem[]
}) {
  return (
    <aside aria-label="Warenkorb-Zusammenfassung" class="flex flex-col gap-space-5">
      <div class="rounded-2xl border border-border-subtle bg-surface p-space-6 shadow-xs dark:border-border-strong/30">
        <h2 class="text-xl font-semibold tracking-tight text-content">Zusammenfassung</h2>

        <dl class="mt-space-5 flex flex-col gap-space-3.5 text-sm">
          <div class="flex items-baseline justify-between text-content-muted">
            <dt>
              Zwischensumme ({props.quantity} {props.quantity === 1 ? "Ticket" : "Tickets"})
            </dt>
            <dd class="font-medium text-content">{props.subtotalLabel}</dd>
          </div>

          <div class="flex items-baseline justify-between text-content-muted">
            <dt>Digitale Bereitstellung</dt>
            <dd class="font-medium text-success">Kostenlos</dd>
          </div>

          <div class="flex items-baseline justify-between text-content-muted">
            <dt>Service- & Vorverkaufsgebühren</dt>
            <dd class="font-medium text-content">{props.feeLabel}</dd>
          </div>

          <div class="my-space-1 border-t border-border-subtle dark:border-border-strong/30" />

          <div class="flex items-baseline justify-between pt-space-1">
            <dt class="flex flex-col">
              <span class="text-base font-bold text-content">Gesamtsumme</span>
              <span class="text-sm text-content-muted">inkl. MwSt.</span>
            </dt>
            <dd class="text-2xl font-bold tracking-tight text-content">{props.totalLabel}</dd>
          </div>
        </dl>

        <div class="mt-space-6 flex flex-col gap-space-3">
          <UiButton size="lg" block onClick={() => props.onCheckout()}>
            Zur Kasse
          </UiButton>
        </div>

        <div class="mt-space-5">
          <TicketBagPaymentMethods title="Zahlungsmethoden" events={props.events} />
        </div>
      </div>
    </aside>
  )
}
