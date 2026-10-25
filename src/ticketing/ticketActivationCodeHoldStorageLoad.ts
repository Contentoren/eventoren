import * as v from "valibot"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import { ticketActivationCodeHoldKey } from "./ticketActivationCodeHoldKey.ts"
import { ticketActivationCodeHoldStorageSave } from "./ticketActivationCodeHoldStorageSave.ts"
import { ticketActivationCodeHoldStoredExpired } from "./ticketActivationCodeHoldStoredExpired.ts"
import {
  type TicketActivationCodeHoldStored,
  ticketActivationCodeHoldStoredSchema,
} from "./ticketActivationCodeHoldStoredSchema.ts"

const op = "ticketActivationCodeHoldStorageLoad"
const recordArraySchema = v.fallback(v.array(v.looseObject({})), [])

export function ticketActivationCodeHoldStorageLoad(): Result<readonly TicketActivationCodeHoldStored[]> {
  if (typeof localStorage === "undefined") return createResult([])

  let raw: string | null
  try {
    raw = localStorage.getItem(ticketActivationCodeHoldKey)
  } catch (error) {
    return createResultError(op, "Freischaltungscodes konnten nicht geladen werden.", error)
  }
  if (!raw) return createResult([])

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return createResultError(op, "Gespeicherte Freischaltungscodes sind ungültig.", error)
  }
  if (!Array.isArray(parsed)) return createResultError(op, "Gespeicherte Freischaltungscodes sind ungültig.", parsed)

  const records: TicketActivationCodeHoldStored[] = []
  for (const entry of v.parse(recordArraySchema, parsed)) {
    const validated = v.safeParse(ticketActivationCodeHoldStoredSchema, entry)
    if (validated.success) records.push(validated.output)
  }

  // Records past the mirrored server deadline leave the store. This is a
  // local mirror only: it never releases the code on the server and never
  // touches an order that already carries the code.
  const live = records.filter((record) => !ticketActivationCodeHoldStoredExpired(record))
  if (live.length !== records.length) ticketActivationCodeHoldStorageSave(live)
  return createResult(live)
}
