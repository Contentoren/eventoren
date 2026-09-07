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
      </div>

      {/* Apple-style Reassurance & Protection Card */}
      <div class="rounded-2xl border border-border-subtle bg-surface-muted/60 p-space-5 dark:border-border-strong/20 dark:bg-surface-muted/20">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-content-muted">Deine Vorteile & Sicherheit</h3>

        <ul class="mt-space-3 flex flex-col gap-space-3 text-sm font-medium text-content">
          <li class="flex items-center gap-space-3">
            <span
              aria-hidden="true"
              class="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand-accent/20 bg-brand-soft text-brand-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span>100 % Original-Tickets direkt vom Veranstalter</span>
          </li>

          <li class="flex items-center gap-space-3">
            <span
              aria-hidden="true"
              class="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand-accent/20 bg-brand-soft text-brand-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span>Sichere 256-Bit SSL-Zahlungsabwicklung</span>
          </li>

          <li class="flex items-center gap-space-3">
            <span
              aria-hidden="true"
              class="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand-accent/20 bg-brand-soft text-brand-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-3.5">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </span>
            <span>Sofortige Zusendung & Apple- & Google-Wallet-Export</span>
          </li>
        </ul>
      </div>
    </aside>
  )
}
