import * as v from "valibot"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import { ticketActivationCodeHoldMemoryStore } from "./ticketActivationCodeHoldMemoryStore.ts"
import { ticketActivationCodeHoldStorageLoad } from "./ticketActivationCodeHoldStorageLoad.ts"
import type { TicketActivationCodeHoldStored } from "./ticketActivationCodeHoldStoredSchema.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"
import { ticketCheckoutRetryKey } from "./ticketCheckoutRetryKey.ts"
import { ticketCheckoutRetryMemoryStore } from "./ticketCheckoutRetryMemoryStore.ts"
import { ticketCheckoutRetryStoredEntries } from "./ticketCheckoutRetryStorageLoad.ts"
import { type TicketCheckoutRetryStored, ticketCheckoutRetryStoredWindow } from "./ticketCheckoutRetryStoredSchema.ts"

const op = "ticketCheckoutRetryStorageSave"

/**
 * One code line of a stored checkout payload.
 *
 * The stored payload keeps the whole first-submit input, so the code lines
 * are read back through this schema instead of being trusted as they are.
 */
const storedCodeLineSchema = v.object({
  tierKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  activationCode: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160))),
})

const storedCodeLinesSchema = v.object({
  tickets: v.array(storedCodeLineSchema),
})

/**
 * The code contexts of one stored snapshot.
 *
 * A code line belongs to the exact event, tier and normalized code context of
 * its own reservation: a snapshot never borrows the window of another code.
 */
function ticketCheckoutRetryStoredCodeLines(
  record: TicketCheckoutRetryStored,
): { readonly tierKey: string; readonly code: string }[] {
  const parsed = v.safeParse(storedCodeLinesSchema, record.checkoutInput)
  if (!parsed.success) return []
  const lines: { readonly tierKey: string; readonly code: string }[] = []
  for (const ticket of parsed.output.tickets) {
    if (ticket.activationCode === undefined) continue
    lines.push({ tierKey: ticket.tierKey, code: ticketActivationCodeNormalize(ticket.activationCode) })
  }
  return lines
}

/**
 * The hold record of one exact event, tier and code context.
 *
 * The same-document mirror answers first, the persisted store is the fallback
 * for a fresh document. A hold that is no longer live carries no deadline:
 * its browser window is over.
 */
function ticketCheckoutRetryHoldFor(
  eventKey: string,
  tierKey: string,
  code: string,
): TicketActivationCodeHoldStored | undefined {
  const context = { eventKey: eventKey.trim(), tierKey: tierKey.trim(), code }
  const mirrored = ticketActivationCodeHoldMemoryStore.get(context)
  if (mirrored !== undefined) return mirrored
  const loaded = ticketActivationCodeHoldStorageLoad()
  if (!loaded.success) return undefined
  return loaded.data.find(
    (hold) => hold.eventKey === context.eventKey && hold.tierKey === context.tierKey && hold.code === context.code,
  )
}

/**
 * Local end of the browser window of one snapshot.
 *
 * The window never outlives the code reservation behind it: the snapshot ends
 * with the earlier of its own window and the window of its code hold. The
 * hold window is counted from the local first save moment of that hold, not
 * from the server clock: a client clock that differs from the server clock
 * would shift the window by that offset.
 *
 * A snapshot without a code hold keeps its own window.
 */
function ticketCheckoutRetryExpiresAt(record: TicketCheckoutRetryStored, savedAt: number): number {
  const own = savedAt + ticketCheckoutRetryStoredWindow.ms
  let earliest: number | undefined
  for (const line of ticketCheckoutRetryStoredCodeLines(record)) {
    const hold = ticketCheckoutRetryHoldFor(record.eventKey, line.tierKey, line.code)
    if (hold === undefined) continue
    const deadline = hold.savedAt + ticketCheckoutRetryStoredWindow.ms
    if (earliest === undefined || deadline < earliest) earliest = deadline
  }
  if (earliest === undefined) return own
  return Math.min(own, earliest)
}

/**
 * The known snapshots of this browser, keyed by their checkout key.
 *
 * One checkout key carries one window: the snapshot with the earliest save
 * moment wins.
 */
function ticketCheckoutRetryKnownByCheckoutKey(
  records: readonly TicketCheckoutRetryStored[],
): Map<string, TicketCheckoutRetryStored> {
  const known = new Map<string, TicketCheckoutRetryStored>()
  for (const record of records) {
    const seen = known.get(record.checkoutKey)
    if (seen === undefined || record.savedAt < seen.savedAt) known.set(record.checkoutKey, record)
  }
  return known
}

/**
 * Applies the stored windows to the snapshots that are written.
 *
 * The window of a checkout key never moves: the first save moment and its
 * expiry win, so a repeated submit of the same booking replays the same
 * browser window instead of a fresh one. A new checkout key starts a new
 * window, the caller decides which key belongs to which attempt.
 */
function ticketCheckoutRetryEffective(
  incoming: readonly TicketCheckoutRetryStored[],
  known: readonly TicketCheckoutRetryStored[],
): TicketCheckoutRetryStored[] {
  const knownByCheckoutKey = ticketCheckoutRetryKnownByCheckoutKey(known)
  const effective = new Map<string, TicketCheckoutRetryStored>()
  for (const record of incoming) {
    const prior = knownByCheckoutKey.get(record.checkoutKey)
    if (prior !== undefined) {
      effective.set(record.checkoutKey, {
        ...record,
        savedAt: Math.min(prior.savedAt, record.savedAt),
        expiresAt: prior.expiresAt,
      })
      continue
    }
    effective.set(record.checkoutKey, {
      ...record,
      savedAt: record.savedAt,
      expiresAt: ticketCheckoutRetryExpiresAt(record, record.savedAt),
    })
  }
  return [...effective.values()]
}

/**
 * Writes the retry snapshots of this browser.
 *
 * The window of a checkout key never moves: the first save moment and its
 * expiry win, so a repeated submit of the same booking replays the same
 * browser window instead of a fresh one.
 *
 * The same-document mirror answers first: a denied browser store must not
 * cost the buyer the retry evidence of the current page. A denied store
 * reports the failed write, the mirror keeps the snapshot alive until the
 * document closes.
 *
 * A malformed store is never overwritten: its unknown records stay untouched
 * and only the same-document mirror carries the new snapshot.
 */
export function ticketCheckoutRetryStorageSave(records: readonly TicketCheckoutRetryStored[]): Result<null> {
  const stored = ticketCheckoutRetryStoredEntries()
  const known = [...(stored.kind === "entries" ? stored.records : []), ...ticketCheckoutRetryMemoryStore.records()]
  const effective = ticketCheckoutRetryEffective(records, known)

  ticketCheckoutRetryMemoryStore.replace(effective)

  if (typeof localStorage === "undefined") return createResult(null)
  if (stored.kind === "malformed") {
    return createResultError(op, "Gespeicherte Checkout-Wiederholung ist ungültig.", stored)
  }
  try {
    const unknown = stored.kind === "entries" ? stored.unknown : []
    localStorage.setItem(ticketCheckoutRetryKey, JSON.stringify([...effective, ...unknown]))
  } catch (error) {
    return createResultError(op, "Checkout-Wiederholung konnte im Browser nicht gespeichert werden.", error)
  }
  return createResult(null)
}
