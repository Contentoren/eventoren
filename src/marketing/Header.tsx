import { Link } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { eventorenAuthControlStateCreate } from "#src/auth/ui/eventorenAuthControlStateCreate.ts"

const siteName = "eventoren"

export function Header() {
  const state = eventorenAuthControlStateCreate()

  return (
    <header class="border-b p-4">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link to="/" class="font-semibold">
          {siteName}
        </Link>
        <div class="flex items-center gap-3">
          <Link to="/sign-in" class="text-sm font-semibold text-brand-accent hover:underline">
            Anmelden
          </Link>
          <Link to="/admin" class="text-sm font-semibold text-brand-accent hover:underline">
            Verwaltung
          </Link>
          <form method="post" action="/logout" onSubmit={state.logout}>
            <Button variant="ghost" size="sm" type="submit">
              Abmelden
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
