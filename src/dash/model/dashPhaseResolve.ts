import type { DashPricePhase } from "./dashPricePhaseSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

type DashPhaseState = "geplant" | "aktiv" | "ausverkauft" | "beendet"

export function dashPhaseResolve(
  ticketType: DashTicketType,
  soldByPhase: Record<string, number>,
  now: Date,
): {
  phase: DashPricePhase | null
  index: number
  state: DashPhaseState
  nextPhase: DashPricePhase | null
  endsReason: "datum" | "kontingent" | null
  endsAt: string | null
  remainingInPhase: number | null
} {
  const phases = ticketType.phases
  const totalSold = Object.values(soldByPhase).reduce((sum, count) => sum + count, 0)
  const soldOut = totalSold >= ticketType.capacity
  if (ticketType.salesStartAt !== null && now < new Date(ticketType.salesStartAt))
    return {
      phase: null,
      index: -1,
      state: "geplant",
      nextPhase: phases[0] ?? null,
      endsReason: null,
      endsAt: null,
      remainingInPhase: null,
    }
  if (ticketType.salesEndAt !== null && now >= new Date(ticketType.salesEndAt))
    return {
      phase: null,
      index: -1,
      state: "beendet",
      nextPhase: null,
      endsReason: null,
      endsAt: null,
      remainingInPhase: null,
    }
  for (const [index, phase] of phases.entries()) {
    if (phase.endsAt !== null && now >= new Date(phase.endsAt)) continue
    if (phase.quota !== null && (soldByPhase[phase.id] ?? 0) >= phase.quota) continue
    const nextPhase = phases[index + 1] ?? null
    const endsReason = phase.endsAt !== null ? "datum" : phase.quota !== null ? "kontingent" : null
    const remainingInPhase = phase.quota === null ? null : Math.max(0, phase.quota - (soldByPhase[phase.id] ?? 0))
    return {
      phase,
      index,
      state: soldOut ? "ausverkauft" : "aktiv",
      nextPhase,
      endsReason,
      endsAt: phase.endsAt,
      remainingInPhase,
    }
  }
  return {
    phase: null,
    index: -1,
    state: soldOut ? "ausverkauft" : "beendet",
    nextPhase: null,
    endsReason: null,
    endsAt: null,
    remainingInPhase: null,
  }
}
