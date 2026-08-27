import { Link } from "@tanstack/solid-router"

export function SiteHeader() {
  return (
    <header class="border-b border-slate-200 bg-white">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5" aria-label="Hauptnavigation">
        <Link to="/" class="font-semibold tracking-tight text-slate-950">
          Eventoren
        </Link>
        <Link to="/kontakt" class="text-sm font-medium text-slate-600 hover:text-slate-950">
          Kontakt
        </Link>
      </nav>
    </header>
  )
}
