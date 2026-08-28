import { Link } from "@tanstack/solid-router"
import { SiteFooter } from "./SiteFooter"
import { SiteHeader } from "./SiteHeader"

export function NotFoundPage() {
  return (
    <div class="min-h-screen bg-surface-base text-content">
      <SiteHeader />
      <main id="content" tabindex="-1" class="mx-auto flex min-h-[60vh] max-w-6xl items-center px-6 py-20">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.25em] text-brand-accent">404</p>
          <h1 class="mt-4 text-4xl font-bold tracking-tight text-content">Diese Seite wurde nicht gefunden.</h1>
          <p class="mt-4 max-w-xl text-lg text-content-muted">Der Link ist veraltet oder die Seite wurde verschoben.</p>
          <div class="mt-8 flex flex-wrap gap-4">
            <Link
              to="/"
              class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-content transition-colors hover:bg-brand-strong"
            >
              Zur Startseite
            </Link>
            <Link
              to="/kontakt"
              class="focus-ring rounded-full border border-border-strong px-5 py-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
            >
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
