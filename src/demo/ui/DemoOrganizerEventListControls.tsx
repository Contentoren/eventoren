import { Link } from "@tanstack/solid-router"
import { demoOrganizerTextGet } from "../model/demoOrganizerTextGet.ts"

export function DemoOrganizerEventListControls(props: { readonly empty: boolean }) {
  return (
    <section
      class="rounded-control border border-brand-accent/30 bg-brand-soft p-space-4"
      aria-labelledby="demo-scenarios"
    >
      <h2 id="demo-scenarios" class="font-semibold text-content">
        {demoOrganizerTextGet().scenariosTitle}
      </h2>
      <p class="mt-space-1 text-sm text-content-muted">{demoOrganizerTextGet().scenariosDescription}</p>
      <div class="mt-space-3 flex flex-wrap gap-space-2">
        <Link
          to="/demo/admin/organizer"
          aria-current={!props.empty ? "page" : undefined}
          class="focus-ring inline-flex min-h-10 items-center rounded-control border border-brand px-space-4 text-sm font-semibold text-brand-accent"
        >
          {demoOrganizerTextGet().populated}
        </Link>
        <Link
          to="/demo/admin/organizer-empty"
          aria-current={props.empty ? "page" : undefined}
          class="focus-ring inline-flex min-h-10 items-center rounded-control border border-brand px-space-4 text-sm font-semibold text-brand-accent"
        >
          {demoOrganizerTextGet().empty}
        </Link>
      </div>
      <div class="mt-space-3 flex flex-wrap items-center gap-space-2 border-t border-brand-accent/20 pt-space-2">
        <span class="text-xs text-content-muted">Admin-Verwaltung:</span>
        <Link to="/demo/admin/organizers" class="focus-ring text-xs font-semibold text-brand-accent hover:underline">
          Veranstalter
        </Link>
        <span class="text-xs text-content-muted">·</span>
        <Link to="/demo/admin/events" class="focus-ring text-xs font-semibold text-brand-accent hover:underline">
          Events
        </Link>
        <span class="text-xs text-content-muted">·</span>
        <Link to="/demo/admin/orders" class="focus-ring text-xs font-semibold text-brand-accent hover:underline">
          Bestellungen
        </Link>
      </div>
    </section>
  )
}
