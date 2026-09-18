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
          to="/demo/organizer"
          aria-current={!props.empty ? "page" : undefined}
          class="focus-ring inline-flex min-h-10 items-center rounded-control border border-brand px-space-4 text-sm font-semibold text-brand-accent"
        >
          {demoOrganizerTextGet().populated}
        </Link>
        <Link
          to="/demo/organizer?scenario=empty"
          aria-current={props.empty ? "page" : undefined}
          class="focus-ring inline-flex min-h-10 items-center rounded-control border border-brand px-space-4 text-sm font-semibold text-brand-accent"
        >
          {demoOrganizerTextGet().empty}
        </Link>
      </div>
    </section>
  )
}
