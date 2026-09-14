import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketOrderAccessRecord } from "./TicketOrderAccessRecord.ts"
import { ticketOrderAccessStorageKey } from "./ticketOrderAccessStorageKey.ts"

const op = "ticketOrderAccessStorageLoad"

export function ticketOrderAccessStorageLoad(): Result<readonly TicketOrderAccessRecord[]> {
  if (typeof localStorage === "undefined") return createResult([])

  let raw: string | null
  try {
    raw = localStorage.getItem(ticketOrderAccessStorageKey)
  } catch (error) {
    return createResultError(op, "Bestellungen konnten nicht geladen werden.", error)
  }
  if (!raw) return createResult([])

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return createResultError(op, "Gespeicherte Bestellungen sind ungültig.", error)
  }
  if (!Array.isArray(parsed)) return createResultError(op, "Gespeicherte Bestellungen sind ungültig.", parsed)

  const records: TicketOrderAccessRecord[] = []
  for (const entry of parsed) {
    if (!isTicketOrderAccessRecord(entry)) continue
    records.push(entry)
  }
  return createResult(records)
}

function isTicketOrderAccessRecord(value: unknown): value is TicketOrderAccessRecord {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<TicketOrderAccessRecord>
  if (typeof candidate.orderId !== "string" || candidate.orderId.length === 0) return false
  if (typeof candidate.checkoutKey !== "string" || !/^[A-Za-z0-9]{32,96}$/u.test(candidate.checkoutKey)) return false
  if (candidate.guestAccessToken === undefined) return true
  return /^[A-Za-z0-9_-]{32,256}$/u.test(candidate.guestAccessToken)
}
