import { createResult, createResultError, type Result } from "#result"

import type { DashCode } from "./dashCodeSchema.ts"

type DashDiscountLine = {
  ticketTypeId: string
  unitPriceCents: number
  quantity: number
}

export function dashDiscountCompute(args: {
  code: DashCode
  lines: DashDiscountLine[]
  usedTickets?: number
  now: Date
}): Result<{ amountCents: number; appliedTickets: number }> {
  const op = "dashDiscountCompute"
  const { code, lines, now } = args
  const usedTickets = args.usedTickets ?? 0
  if (code.kind !== "rabatt" || code.discount === null)
    return createResultError(op, "Code gilt nicht für diese Tickets")
  if (!code.active) return createResultError(op, "Code ist nicht aktiv")
  if (code.validFrom !== null && now < new Date(code.validFrom)) return createResultError(op, "Code gilt noch nicht")
  if (code.validUntil !== null && now > new Date(code.validUntil)) return createResultError(op, "Code ist abgelaufen")
  const eligible = lines.filter(
    (line) => code.ticketTypeIds.length === 0 || code.ticketTypeIds.includes(line.ticketTypeId),
  )
  if (eligible.length === 0) return createResultError(op, "Code gilt nicht für diese Tickets")
  if (code.maxTickets !== null && usedTickets >= code.maxTickets) return createResultError(op, "Code ist aufgebraucht")
  const remaining = code.maxTickets === null ? null : code.maxTickets - usedTickets
  const prices = eligible.flatMap((line) => Array.from({ length: line.quantity }, () => line.unitPriceCents))
  prices.sort((a, b) => b - a)
  const limited = remaining === null ? prices : prices.slice(0, remaining)
  let amountCents = 0
  for (const price of limited) {
    if (code.discount.type === "prozent") amountCents += Math.round((price * code.discount.value) / 10000)
    else amountCents += Math.min(code.discount.value, price)
  }
  return createResult({ amountCents, appliedTickets: limited.length })
}
