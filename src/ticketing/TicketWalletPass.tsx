import { For } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { TicketOrder } from "./TicketOrder.ts"
import { TicketPaymentMethodIcon } from "./TicketPaymentMethodIcon.tsx"
import { TicketQrCode } from "./TicketQrCode.tsx"
import { ticketWalletPassStateCreate } from "./ticketWalletPassStateCreate.ts"

export function TicketWalletPass(props: { order: TicketOrder }) {
  const state = ticketWalletPassStateCreate({ order: () => props.order })

  return (
    <article
      class="overflow-hidden rounded-card border border-border-strong bg-surface text-content"
      aria-labelledby={`wallet-pass-${props.order.id}`}
    >
      <header class="flex flex-col gap-space-2 bg-linear-to-br from-brand-strong to-brand px-space-6 py-space-6 text-brand-content">
        <p class="text-sm font-semibold uppercase tracking-widest text-white/90">Eventoren Wallet-Ticket</p>
        <h3 id={`wallet-pass-${props.order.id}`} class="text-xl font-semibold leading-snug">
          {props.order.eventTitle}
        </h3>
        <p class="text-sm font-medium text-white/90">
          {state.dateLabel()} · {state.timeLabel()}
        </p>
      </header>

      <div class="flex flex-col gap-space-6 p-space-6 sm:flex-row sm:items-start sm:justify-between">
        <dl class="flex flex-1 flex-col gap-space-4">
          <div class="flex flex-col gap-space-1">
            <dt class="text-sm text-content-muted">Ort</dt>
            <dd class="text-sm font-medium text-content">{state.locationLabel()}</dd>
            <dd class="text-sm text-content-muted">{props.order.address}</dd>
          </div>
          <div class="flex flex-col gap-space-1">
            <dt class="text-sm text-content-muted">Einlass</dt>
            <dd class="text-sm font-medium text-content">{state.doorsLabel()}</dd>
          </div>
          <div class="flex flex-col gap-space-1">
            <dt class="text-sm text-content-muted">Ticketinhaber:in</dt>
            <dd class="text-sm font-medium text-content">{state.holderLabel()}</dd>
          </div>
          <div class="flex flex-col gap-space-1">
            <dt class="text-sm text-content-muted">Bezahlt mit</dt>
            <dd class="flex items-center gap-space-2 text-sm font-medium text-content">
              <TicketPaymentMethodIcon method={state.paymentMethod()} />
              {state.paymentLabel()}
            </dd>
          </div>
          <div class="flex flex-col gap-space-2">
            <dt class="text-sm text-content-muted">Tickets</dt>
            <For each={state.lineLabels()}>
              {(line) => (
                <dd class="flex items-baseline justify-between gap-space-4 text-sm text-content">
                  <span>{line.label}</span>
                  <span class="font-medium">{line.priceLabel}</span>
                </dd>
              )}
            </For>
          </div>
          <div class="flex items-baseline justify-between gap-space-4 border-t border-border-subtle pt-space-3">
            <dt class="text-sm font-semibold text-content">Gesamt inkl. Gebühren</dt>
            <dd class="text-sm font-semibold text-content">{state.totalLabel()}</dd>
          </div>
        </dl>

        <div class="flex flex-col items-center gap-space-3">
          <TicketQrCode value={state.qrValue()} label={state.qrLabel()} />
          <UiBadge tone="success">{state.quantityLabel()}</UiBadge>
        </div>
      </div>

      <footer class="border-t border-border-subtle px-space-6 py-space-4">
        <p class="text-sm text-content-muted">
          Offline verfügbar – zeige diesen QR-Code am Einlass oder drucke die Seite aus.
        </p>
      </footer>
    </article>
  )
}
