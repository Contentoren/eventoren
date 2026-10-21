import { createResult, createResultError, type Result } from "#result"

/**
 * Validates an access (zugang) code against the requested hidden ticket
 * types. Discount codes are priced by `organizerDashboardDiscountCompute`;
 * this check covers code state, time window, ticket budget and tier binding.
 */
export function organizerDashboardCodeValidate(args: {
  readonly kind: "rabatt" | "zugang"
  readonly tierKeys: readonly string[]
  readonly maxTickets: number | null
  readonly usedTickets: number
  readonly active: boolean
  readonly validFrom: string | null
  readonly validUntil: string | null
  readonly requestedTierKeys: readonly string[]
  readonly nowIso: string
}): Result<{ readonly unlockedTierKeys: readonly string[] }> {
  const op = "organizerDashboardCodeValidate"
  const now = Date.parse(args.nowIso)
  if (Number.isNaN(now)) return createResultError(op, "nowIso als ISO-UTC erforderlich")
  if (!args.active) return createResultError(op, "Code ist nicht aktiv")
  if (args.validFrom !== null) {
    const from = Date.parse(args.validFrom)
    if (Number.isNaN(from)) return createResultError(op, "validFrom als ISO-UTC erforderlich")
    if (now < from) return createResultError(op, "Code gilt noch nicht")
  }
  if (args.validUntil !== null) {
    const until = Date.parse(args.validUntil)
    if (Number.isNaN(until)) return createResultError(op, "validUntil als ISO-UTC erforderlich")
    if (now > until) return createResultError(op, "Code ist abgelaufen")
  }
  if (args.maxTickets !== null && args.usedTickets >= args.maxTickets) {
    return createResultError(op, "Code ist aufgebraucht")
  }
  if (args.kind === "zugang") {
    if (args.tierKeys.length === 0) {
      return createResultError(op, "Zugangscode schaltet keine Ticketart frei")
    }
    const unlocked = args.requestedTierKeys.filter((tierKey) => args.tierKeys.includes(tierKey))
    if (unlocked.length === 0) return createResultError(op, "Code gilt nicht für diese Tickets")
    return createResult({ unlockedTierKeys: unlocked })
  }
  const eligible = args.requestedTierKeys.filter(
    (tierKey) => args.tierKeys.length === 0 || args.tierKeys.includes(tierKey),
  )
  if (eligible.length === 0) return createResultError(op, "Code gilt nicht für diese Tickets")
  return createResult({ unlockedTierKeys: eligible })
}
