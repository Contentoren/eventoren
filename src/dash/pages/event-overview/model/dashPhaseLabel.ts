import { dashRelativeTimeFormat } from "#src/dash/model/dashRelativeTimeFormat.ts"
import type { dashPhaseResolve } from "#src/dash/model/dashPhaseResolve.ts"

type DashPhaseInfo = ReturnType<typeof dashPhaseResolve>

/** Kurzes deutsches Phasen-Label für die Ticketarten-Tabelle ("Phase 1 · endet in 3 Tagen"). */
export function dashPhaseLabel(info: DashPhaseInfo, now: Date): string {
  if (info.state === "ausverkauft") return "Ausverkauft"
  if (info.phase === null) {
    if (info.state === "geplant") return "Geplant"
    return "Beendet"
  }
  const base = info.phase.name
  if (info.endsReason === "datum" && info.endsAt !== null) {
    const relative = dashRelativeTimeFormat(info.endsAt, now)
    return `${base} · endet ${relative}`
  }
  if (info.endsReason === "kontingent" && info.remainingInPhase !== null)
    return `${base} · ab ${info.remainingInPhase} Tickets`
  return base
}
