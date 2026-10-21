import { createResult, createResultError, type Result } from "#result"

export type OrganizerDashboardPhaseState = "geplant" | "aktiv" | "ausverkauft" | "beendet"

export type OrganizerDashboardPhaseInput = {
  readonly phaseKey: string
  readonly name: string
  readonly priceCents: number
  readonly endsAt: string | null
  readonly quota: number | null
  readonly soldCount: number
  readonly sortOrder: number
}

export type OrganizerDashboardPhaseResolution = {
  readonly phase: OrganizerDashboardPhaseInput | null
  readonly index: number
  readonly state: OrganizerDashboardPhaseState
  readonly nextPhase: OrganizerDashboardPhaseInput | null
  readonly endsReason: "datum" | "kontingent" | null
  readonly endsAt: string | null
  readonly remainingInPhase: number | null
}

/**
 * Resolves the active automatic price phase for one ticket tier.
 * A phase ends at `endsAt` or once `quota` sales of that phase are reached,
 * whichever comes first; afterwards the next phase in `sortOrder` applies.
 * Storage and comparison use UTC instants; Berlin display is derived by callers.
 */
export function organizerDashboardPhaseResolve(args: {
  readonly phases: readonly OrganizerDashboardPhaseInput[]
  readonly capacity: number
  readonly salesStartAt: string | null
  readonly salesEndAt: string | null
  readonly nowIso: string
}): Result<OrganizerDashboardPhaseResolution> {
  const op = "organizerDashboardPhaseResolve"
  const now = Date.parse(args.nowIso)
  if (Number.isNaN(now)) return createResultError(op, "nowIso als ISO-UTC erforderlich")
  const ordered = [...args.phases].sort((a, b) => a.sortOrder - b.sortOrder)
  const totalSold = ordered.reduce((sum, phase) => sum + phase.soldCount, 0)
  const soldOut = totalSold >= args.capacity
  if (args.salesStartAt !== null) {
    const start = Date.parse(args.salesStartAt)
    if (Number.isNaN(start)) return createResultError(op, "salesStartAt als ISO-UTC erforderlich")
    if (now < start) {
      return createResult({
        phase: null,
        index: -1,
        state: "geplant",
        nextPhase: ordered[0] ?? null,
        endsReason: null,
        endsAt: null,
        remainingInPhase: null,
      })
    }
  }
  if (args.salesEndAt !== null) {
    const end = Date.parse(args.salesEndAt)
    if (Number.isNaN(end)) return createResultError(op, "salesEndAt als ISO-UTC erforderlich")
    if (now >= end) {
      return createResult({
        phase: null,
        index: -1,
        state: "beendet",
        nextPhase: null,
        endsReason: null,
        endsAt: null,
        remainingInPhase: null,
      })
    }
  }
  for (const [index, phase] of ordered.entries()) {
    if (phase.endsAt !== null) {
      const phaseEnd = Date.parse(phase.endsAt)
      if (Number.isNaN(phaseEnd)) return createResultError(op, "endsAt als ISO-UTC erforderlich")
      if (now >= phaseEnd) continue
    }
    if (phase.quota !== null && phase.soldCount >= phase.quota) continue
    return createResult({
      phase,
      index,
      state: soldOut ? "ausverkauft" : "aktiv",
      nextPhase: ordered[index + 1] ?? null,
      endsReason: phase.endsAt !== null ? "datum" : phase.quota !== null ? "kontingent" : null,
      endsAt: phase.endsAt,
      remainingInPhase: phase.quota === null ? null : Math.max(0, phase.quota - phase.soldCount),
    })
  }
  return createResult({
    phase: null,
    index: -1,
    state: soldOut ? "ausverkauft" : "beendet",
    nextPhase: null,
    endsReason: null,
    endsAt: null,
    remainingInPhase: null,
  })
}
