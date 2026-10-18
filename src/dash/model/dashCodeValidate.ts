import { createResult, createResultError, type Result } from "#result"

import type { DashCode } from "./dashCodeSchema.ts"

export function dashCodeValidate(options: {
  input: string
  codes: DashCode[]
  eventId: string
  now: Date
}): Result<DashCode> {
  const op = "dashCodeValidate"
  const normalized = options.input.trim().toUpperCase()
  if (!normalized) return createResultError(op, "Bitte gib einen Code ein.")
  const found = options.codes.find((code) => code.eventId === options.eventId && code.code === normalized)
  if (!found) return createResultError(op, "Code nicht gefunden")
  if (!found.active) return createResultError(op, "Code ist nicht aktiv")
  if (found.validFrom && Date.parse(found.validFrom) > options.now.getTime())
    return createResultError(op, "Code gilt noch nicht")
  if (found.validUntil && Date.parse(found.validUntil) < options.now.getTime())
    return createResultError(op, "Code ist abgelaufen")
  if (found.maxTickets !== null && found.usedTickets >= found.maxTickets)
    return createResultError(op, "Code ist aufgebraucht")
  return createResult(found)
}
