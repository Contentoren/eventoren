import { Link } from "@tanstack/solid-router"

export function SiteFooter() {
  return (
    <footer class="border-t border-slate-200 bg-slate-50">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© Eventoren</p>
        <nav class="flex gap-4" aria-label="Rechtliche Informationen">
          <Link to="/impressum" class="hover:text-slate-950">
            Impressum
          </Link>
          <Link to="/agb" class="hover:text-slate-950">
            AGB
          </Link>
        </nav>
      </div>
    </footer>
  )
}
