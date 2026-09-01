export function ContactDirectInfo() {
  return (
    <aside aria-label="Direkte Kontaktdaten" class="flex flex-col gap-space-5">
      <div class="flex flex-col gap-space-4 rounded-2xl border border-border-subtle bg-surface p-space-5 shadow-xs sm:p-space-6 dark:border-border-strong/30">
        <h2 class="text-lg font-semibold tracking-tight text-content">Direkter Kontakt</h2>

        <div class="flex flex-col gap-space-4 text-sm">
          <div class="flex items-start gap-space-3">
            <span
              aria-hidden="true"
              class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand-accent/20 bg-brand-soft text-brand-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </span>
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-content-muted">Veranstalter & Partnerschaften</span>
              <a
                href="mailto:partner@eventoren.de"
                class="font-semibold text-content hover:text-brand-accent hover:underline"
              >
                partner@eventoren.de
              </a>
            </div>
          </div>

          <div class="flex items-start gap-space-3">
            <span
              aria-hidden="true"
              class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand-accent/20 bg-brand-soft text-brand-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-content-muted">Besucher & Ticket-Support</span>
              <a
                href="mailto:support@eventoren.de"
                class="font-semibold text-content hover:text-brand-accent hover:underline"
              >
                support@eventoren.de
              </a>
            </div>
          </div>

          <div class="flex items-start gap-space-3">
            <span
              aria-hidden="true"
              class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-brand-accent/20 bg-brand-soft text-brand-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-content-muted">Servicezeiten</span>
              <span class="font-medium text-content">Mo – Fr: 09:00 – 18:00 Uhr</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
