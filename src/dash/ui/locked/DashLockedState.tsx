import { mdiLockOutline } from "@adaptive-ds/mdi/mdiLockOutline.js"
import { cn } from "cn"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"

export interface DashLockedStateProps {
  title?: string
  description: string
  class?: string
}

/** Sperrzustand bei fehlender Berechtigung: Schloss-Icon, ein Satz, in einer Karte. */
export function DashLockedState(p: DashLockedStateProps) {
  return (
    <div class={cn("rounded-card border border-border-subtle bg-surface", p.class)}>
      <EmptyState icon={mdiLockOutline} title={p.title ?? "Kein Zugriff"} description={p.description} size="md" />
    </div>
  )
}
