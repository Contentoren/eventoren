import type { TicketActivationCodeHoldStored } from "./ticketActivationCodeHoldStoredSchema.ts"

/** Mirrored hold window: 15 minutes from the first successful reservation. */
const holdWindowMs = 15 * 60 * 1000

/**
 * Client-side deadline of one stored hold record.
 *
 * The browser mirrors the server window exactly: 15 minutes after the first
 * successful reservation of that server window. The record's `expiresAt`
 * stays the proof of the server window and keeps the authority over the
 * server side, but it never lengthens the local mirror - a repeated entry
 * must not refresh the browser deadline.
 *
 * The deadline is counted in the client clock, so a client clock that
 * differs from the server clock shifts the mirrored window by that offset.
 * The server releases its own window at its own deadline; the local prune
 * never releases anything on the server.
 */
function ticketActivationCodeHoldStoredDeadline(record: TicketActivationCodeHoldStored): number {
  return record.savedAt + holdWindowMs
}

/**
 * True when the stored record is past the mirrored deadline.
 *
 * The deadline is inclusive: at exactly 15 minutes after the first
 * successful reservation the record is expired, one second earlier it is
 * still live.
 *
 * The check is a purely local mirror: it never releases the code on the
 * server. A pending order keeps its own server-side binding, so an expired
 * browser record never frees anything.
 */
export function ticketActivationCodeHoldStoredExpired(
  record: TicketActivationCodeHoldStored,
  now: number = Date.now(),
): boolean {
  return now >= ticketActivationCodeHoldStoredDeadline(record)
}
