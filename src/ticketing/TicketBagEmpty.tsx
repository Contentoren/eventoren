import { Link } from "@tanstack/solid-router"

export function TicketBagEmpty(props: { eventsHref?: string } = {}) {
  return (
    <div class="flex flex-col items-center justify-center rounded-3xl border border-border-subtle/80 bg-surface px-space-6 py-12 text-center shadow-xs sm:px-space-7 sm:py-16 dark:border-border-strong/20">
      <div
        aria-hidden="true"
        class="flex size-20 items-center justify-center rounded-full bg-surface-muted ring-1 ring-border-strong/30"
      >
        <svg viewBox="0 0 24 24" class="size-10 text-content-muted" fill="none" stroke="currentColor">
          <path
            d="M4 5h2l1.6 9.2a2 2 0 0 0 2 1.8h6.9a2 2 0 0 0 2-1.7L20 8H7"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="10" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="17" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <h2 class="mt-space-6 text-2xl font-bold tracking-tight text-content sm:text-3xl">Dein Warenkorb ist leer.</h2>

      <p class="mt-space-3 max-w-md text-sm leading-relaxed text-content-muted sm:text-base">
        Entdecke anstehende Konzerte, Festivals und Kultur-Events und sichere dir deine Tickets direkt digital.
      </p>

      <div class="mt-space-7 flex flex-wrap items-center justify-center gap-space-4">
        {props.eventsHref ? (
          <a
            href={props.eventsHref}
            class="focus-ring inline-flex h-12 items-center justify-center rounded-xl bg-brand px-space-7 text-sm font-semibold text-brand-content shadow-xs transition-colors hover:bg-brand-strong"
          >
            Events entdecken
          </a>
        ) : (
          <Link
            to="/"
            class="focus-ring inline-flex h-12 items-center justify-center rounded-xl bg-brand px-space-7 text-sm font-semibold text-brand-content shadow-xs transition-colors hover:bg-brand-strong"
          >
            Events entdecken
          </Link>
        )}
      </div>
    </div>
  )
}
