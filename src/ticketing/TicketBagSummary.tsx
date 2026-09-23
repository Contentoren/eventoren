import { UiButton } from "../ui/UiButton.tsx"

export function TicketBagSummary(props: {
  subtotalLabel: string
  feeLabel: string
  totalLabel: string
  quantity: number
  onCheckout: () => void
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
            <dt>Digitale Bereitstellung & Wallet-Pass</dt>
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

        <div class="mt-space-5 flex flex-col gap-space-3 rounded-control border border-border-subtle bg-surface-muted/50 p-space-4">
          <p class="text-xs font-medium text-content">Zahlungsmethoden</p>
          <ul class="grid w-full grid-cols-4 gap-space-3" aria-label="Unterstützte Zahlungsmethoden">
            <li class="min-w-0">
              <img src="/images/payment-methods/paypal-old.png" alt="PayPal" class="h-10 w-full object-contain" />
            </li>
            <li class="min-w-0">
              <img src="/images/payment-methods/visa-alternate.png" alt="Visa" class="h-10 w-full object-contain" />
            </li>
            <li class="min-w-0">
              <img src="/images/payment-methods/sepa.png" alt="SEPA" class="h-10 w-full object-contain" />
            </li>
            <li class="min-w-0">
              <img
                src="/images/payment-methods/klarna-sofort.png"
                alt="Klarna Sofort"
                class="h-10 w-full object-contain"
              />
            </li>
            <li class="min-w-0">
              <img src="/images/payment-methods/mastercard.png" alt="Mastercard" class="h-10 w-full object-contain" />
            </li>
            <li class="min-w-0">
              <img src="/images/payment-methods/maestro.png" alt="Maestro" class="h-10 w-full object-contain" />
            </li>
            <li class="min-w-0">
              <img
                src="/images/payment-methods/american-express.png"
                alt="American Express"
                class="h-10 w-full object-contain"
              />
            </li>
            <li class="min-w-0">
              <img src="/images/payment-methods/discover.png" alt="Discover" class="h-10 w-full object-contain" />
            </li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
