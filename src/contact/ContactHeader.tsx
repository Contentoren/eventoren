export function ContactHeader() {
  return (
    <header class="flex flex-col gap-space-4">
      <div class="flex flex-col gap-space-2">
        <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Kontakt & Veranstalter-Partner</h1>
        <p class="text-base text-content-muted sm:text-lg">
          Verkaufe deine Event-Tickets direkt über Eventoren oder erhalte sofortigen Support für deine Buchung.
        </p>
      </div>

      <div class="my-4 grid grid-cols-1 gap-x-6 gap-y-4 border-y border-border-subtle py-4 sm:grid-cols-2">
        <div class="flex items-center gap-3">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="text-xs font-semibold text-content-muted">Antwortzeit</span>
            <span class="text-sm font-bold text-content sm:text-base">Unter 24 Stunden (Mo–Fr)</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="text-xs font-semibold text-content-muted">Support-Team</span>
            <span class="text-sm font-bold text-content sm:text-base">Support für Besucher & Veranstalter</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="text-xs font-semibold text-content-muted">Standorte</span>
            <span class="text-sm font-bold text-content sm:text-base">Berlin, Hamburg & Zürich</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-muted/60 text-brand-accent shadow-xs"
            aria-hidden="true"
          >
            <svg
              class="size-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2" />
              <path d="M13 11v2" />
              <path d="M13 17v2" />
            </svg>
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="text-xs font-semibold text-content-muted">Veranstalter-Onboarding</span>
            <span class="text-sm font-bold text-content sm:text-base">Kostenlos & innerhalb von 1 Tag aktiv</span>
          </div>
        </div>
      </div>
    </header>
  )
}
