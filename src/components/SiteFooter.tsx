import { Link } from "@tanstack/solid-router"

export function SiteFooter() {
  return (
    <footer class="relative z-10 border-t border-border-subtle bg-surface">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-content-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© Eventoren</p>
        <nav class="flex gap-4" aria-label="Rechtliche Informationen">
          <Link to="/impressum" class="focus-ring rounded-control transition-colors hover:text-content">
            Impressum
          </Link>
          <Link to="/agb" class="focus-ring rounded-control transition-colors hover:text-content">
            AGB
          </Link>
          <Link to="/kontakt" class="transition-colors hover:text-content">
            Kontakt
          </Link>
        </nav>
      </div>
    </footer>
  )
}
