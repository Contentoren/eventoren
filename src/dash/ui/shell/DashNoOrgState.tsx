import { mdiDomainPlus } from "@adaptive-ds/mdi/mdiDomainPlus.js"
import { Link } from "@tanstack/solid-router"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"

export function dashNoOrgVisible(): boolean {
  return dashActiveOrg() === null
}

export function DashNoOrgState() {
  return (
    <div class="flex min-h-dvh items-center justify-center bg-surface-base px-4 py-10">
      <div class="w-full max-w-md rounded-card border border-border-subtle bg-surface p-4 shadow-sm sm:p-5">
        <EmptyState
          icon={mdiDomainPlus}
          title="Willkommen bei Eventoren"
          description="Lege deine Organisation an und verkaufe deine ersten Tickets."
          actions={
            <Link
              to="/demo/onboarding"
              class="inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              Organisation erstellen
            </Link>
          }
        />
      </div>
    </div>
  )
}
