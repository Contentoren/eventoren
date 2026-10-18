import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import type { DashCode } from "../../model/dashCodeSchema.ts"

/**
 * Löst je Zeile die Phase zu `createdAt` über `soldByPhase` auf.
 * Gibt null zurück, wenn keine Ticketart etwas verkaufen kann.
 */
export function dashSeedLinePick(args: {
  types: DashTicketType[]
  soldByType: Map<string, { sold: number; soldByPhase: Record<string, number> }>
  createdAt: Date
  random: () => number
  allowedTypes?: DashTicketType[]
  code: DashCode | null
  nowForPhase: (
    ticketType: DashTicketType,
    soldByPhase: Record<string, number>,
    at: Date,
  ) => DashTicketType["phases"][number] | null
}): { ticketType: DashTicketType; phase: DashTicketType["phases"][number]; maxQty: number } | null {
  const pool = args.allowedTypes ?? args.types
  const candidates: { ticketType: DashTicketType; phase: DashTicketType["phases"][number] }[] = []
  for (const type of pool) {
    if (type.channel !== "online") continue
    const sold = args.soldByType.get(type.id)
    if (sold && sold.sold >= type.capacity) continue
    if (args.code !== null && args.code.ticketTypeIds.length > 0 && !args.code.ticketTypeIds.includes(type.id)) continue
    const phase = args.nowForPhase(type, sold?.soldByPhase ?? {}, args.createdAt)
    if (phase === null) continue
    candidates.push({ ticketType: type, phase })
  }
  if (candidates.length === 0) return null
  const picked = candidates[Math.floor(args.random() * candidates.length)]
  if (!picked) return null
  const sold = args.soldByType.get(picked.ticketType.id)
  const remainingType = picked.ticketType.capacity - (sold?.sold ?? 0)
  const remainingPhase =
    picked.phase.quota === null
      ? remainingType
      : Math.max(0, picked.phase.quota - (sold?.soldByPhase[picked.phase.id] ?? 0))
  const maxQty = Math.min(
    picked.ticketType.maxPerOrder,
    remainingType,
    remainingPhase === 0 ? remainingType : Math.max(1, remainingPhase),
  )
  if (maxQty < 1 || remainingType < 1) return null
  return { ticketType: picked.ticketType, phase: picked.phase, maxQty }
}

export function dashSeedPhaseResolveAt(
  ticketType: DashTicketType,
  soldByPhase: Record<string, number>,
  at: Date,
): DashTicketType["phases"][number] | null {
  if (ticketType.salesStartAt !== null && at < new Date(ticketType.salesStartAt)) return null
  if (ticketType.salesEndAt !== null && at >= new Date(ticketType.salesEndAt)) return null
  const totalSold = Object.values(soldByPhase).reduce((sum, count) => sum + count, 0)
  if (totalSold >= ticketType.capacity) return null
  for (const phase of ticketType.phases) {
    if (phase.endsAt !== null && at >= new Date(phase.endsAt)) continue
    if (phase.quota !== null && (soldByPhase[phase.id] ?? 0) >= phase.quota) continue
    return phase
  }
  return null
}
