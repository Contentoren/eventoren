import { createResult, createResultError, type Result } from "#result"

export type OrganizerDashboardDiscountLine = {
  readonly tierKey: string
  readonly unitPriceCents: number
  readonly quantity: number
}

/**
 * Computes the discount amount of a rabatt code over cart lines in whole
 * cents. Percent values are basis points (1000 = 10 %); fixed amounts apply
 * per ticket and never exceed the ticket price. The cheapest tickets lose
 * out first when the ticket limit is reached: the most expensive tickets are
 * discounted first.
 */
export function organizerDashboardDiscountCompute(args: {
  readonly discountType: "prozent" | "betrag"
  readonly discountValue: number
  readonly tierKeys: readonly string[]
  readonly maxTickets: number | null
  readonly usedTickets: number
  readonly active: boolean
  readonly validFrom: string | null
  readonly validUntil: string | null
  readonly lines: readonly OrganizerDashboardDiscountLine[]
  readonly nowIso: string
}): Result<{ readonly amountCents: number; readonly appliedTickets: number }> {
  const op = "organizerDashboardDiscountCompute"
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
  const eligible = args.lines.filter((line) => args.tierKeys.length === 0 || args.tierKeys.includes(line.tierKey))
  if (eligible.length === 0) return createResultError(op, "Code gilt nicht für diese Tickets")
  if (args.maxTickets !== null && args.usedTickets >= args.maxTickets) {
    return createResultError(op, "Code ist aufgebraucht")
  }
  const remaining = args.maxTickets === null ? null : args.maxTickets - args.usedTickets
  const prices = eligible.flatMap((line) => Array.from({ length: line.quantity }, () => line.unitPriceCents))
  prices.sort((a, b) => b - a)
  const limited = remaining === null ? prices : prices.slice(0, remaining)
  let amountCents = 0
  for (const price of limited) {
    if (args.discountType === "prozent") amountCents += Math.round((price * args.discountValue) / 10000)
    else amountCents += Math.min(args.discountValue, price)
  }
  return createResult({ amountCents, appliedTickets: limited.length })
}
