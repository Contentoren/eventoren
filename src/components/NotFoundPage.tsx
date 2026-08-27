import { Link } from "@tanstack/solid-router"
import { SiteFooter } from "./SiteFooter"
import { SiteHeader } from "./SiteHeader"

export function NotFoundPage() {
  return (
    <div class="min-h-screen bg-white text-slate-950">
      <SiteHeader />
      <main class="mx-auto flex min-h-[60vh] max-w-6xl items-center px-6 py-20">
        <div>
          <p class="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">404</p>
          <h1 class="mt-4 text-4xl font-bold tracking-tight">Diese Seite wurde nicht gefunden.</h1>
          <p class="mt-4 max-w-xl text-lg text-slate-600">Der Link ist veraltet oder die Seite wurde verschoben.</p>
          <div class="mt-8 flex flex-wrap gap-4">
            <Link to="/" class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Zur Startseite
            </Link>
            <Link to="/kontakt" class="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold">
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
