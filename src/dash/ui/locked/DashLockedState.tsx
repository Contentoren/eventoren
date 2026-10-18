import { mdiLockOutline } from "@adaptive-ds/mdi/mdiLockOutline.js"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

export interface DashLockedStateProps {
  title?: string
  description: string
  class?: string
}

/** Sperrzustand bei fehlender Berechtigung: Schloss-Icon, ein Satz, in einer Karte. */
export function DashLockedState(p: DashLockedStateProps) {
  return (
    <div class={classMerge("rounded-card border border-border-subtle bg-surface", p.class)}>
      <EmptyState icon={mdiLockOutline} title={p.title ?? "Kein Zugriff"} description={p.description} size="md" />
    </div>
  )
}
