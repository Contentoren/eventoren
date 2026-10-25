import * as v from "valibot"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import { ticketActivationCodeHoldMemoryStore } from "./ticketActivationCodeHoldMemoryStore.ts"
import { ticketActivationCodeHoldStorageLoad } from "./ticketActivationCodeHoldStorageLoad.ts"
import { ticketActivationCodeHoldStorageSave } from "./ticketActivationCodeHoldStorageSave.ts"
import {
  type TicketActivationCodeHoldStored,
  ticketActivationCodeHoldStoredSchema,
} from "./ticketActivationCodeHoldStoredSchema.ts"

const op = "ticketActivationCodeHoldStorageUpsert"

function sameHoldContext(
  left: Pick<TicketActivationCodeHoldStored, "eventKey" | "tierKey" | "code">,
  right: Pick<TicketActivationCodeHoldStored, "eventKey" | "tierKey" | "code">,
): boolean {
  return left.eventKey === right.eventKey && left.tierKey === right.tierKey && left.code === right.code
}

/**
 * True when both records belong to the same server hold window.
 *
 * A window is identified by its credential together with the server
 * deadline that belongs to it. A new credential or a new server deadline is
 * a new window for the same code, even when the code itself never changes.
 */
function sameHoldWindow(
  left: Pick<TicketActivationCodeHoldStored, "holdToken" | "expiresAt">,
  right: Pick<TicketActivationCodeHoldStored, "holdToken" | "expiresAt">,
): boolean {
  return left.holdToken === right.holdToken && left.expiresAt === right.expiresAt
}

/**
 * Save moment of the first successful reservation of the same window.
 *
 * Every repeated entry of one window keeps the first save moment, so the
 * mirrored 15 minute window is never refreshed by a repeat. Only a new
 * server window - a new credential or a new server deadline - starts a new
 * mirrored window with a new save moment.
 */
function ticketActivationCodeHoldWindowSavedAt(
  known: readonly TicketActivationCodeHoldStored[],
  next: TicketActivationCodeHoldStored,
): number | undefined {
  let earliest: number | undefined
  for (const candidate of known) {
    if (!sameHoldContext(candidate, next)) continue
    if (!sameHoldWindow(candidate, next)) continue
    if (earliest === undefined || candidate.savedAt < earliest) earliest = candidate.savedAt
  }
  return earliest
}

/**
 * Records the caller's own hold credential for one normalized code.
 *
 * The credential reaches the same-document mirror first: a denied browser
 * store must not cost the buyer the credential of a reservation that already
 * exists on the server. The persistent store is best-effort afterwards, so a
 * denied store never fails the purchase.
 *
 * A repeated entry of the same server window keeps the save moment of the
 * first successful reservation, so the mirrored deadline is never refreshed
 * by a repeat. A new server window starts a new mirrored window.
 */
export function ticketActivationCodeHoldStorageUpsert(record: TicketActivationCodeHoldStored): Result<null> {
  const validated = v.safeParse(ticketActivationCodeHoldStoredSchema, record)
  if (!validated.success) {
    return createResultError(op, "Freischaltungscode konnte nicht gespeichert werden.", validated.issues)
  }
  const next = validated.output

  const loaded = ticketActivationCodeHoldStorageLoad()
  const known = [...ticketActivationCodeHoldMemoryStore.records(), ...(loaded.success ? loaded.data : [])]
  const savedAt = ticketActivationCodeHoldWindowSavedAt(known, next) ?? next.savedAt
  const stored: TicketActivationCodeHoldStored = { ...next, savedAt }

  ticketActivationCodeHoldMemoryStore.set(stored)

  // An unreadable store stays untouched: the mirror keeps the credential for
  // this document, the broken store is never silently overwritten.
  if (!loaded.success) return loaded

  const others: TicketActivationCodeHoldStored[] = []
  for (const candidate of known) {
    if (sameHoldContext(candidate, stored)) continue
    if (others.some((kept) => sameHoldContext(kept, candidate))) continue
    others.push(candidate)
  }
  return ticketActivationCodeHoldStorageSave([stored, ...others])
}
