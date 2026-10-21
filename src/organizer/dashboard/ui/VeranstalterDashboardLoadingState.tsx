import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"

/** Loading placeholder for the Veranstalter dashboard shell. */
export function VeranstalterDashboardLoadingState() {
  return (
    <div class="flex flex-col gap-4" role="status" aria-label="Veranstalter-Dashboard wird geladen">
      <Skeleton class="h-8 w-56" />
      <Skeleton class="h-4 w-full max-w-md" />
      <Skeleton class="h-48 rounded-card border border-border-subtle" />
    </div>
  )
}
