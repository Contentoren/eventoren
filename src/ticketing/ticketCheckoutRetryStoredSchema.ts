import * as v from "valibot"

/**
 * Browser retry snapshot of one code-bound checkout attempt.
 *
 * The snapshot stores the exact material input of the first network submit:
 * the same checkout key, the same guest credential, the validated contact and
 * participant evidence, and the untouched checkout payload. A retry reuses the
 * stored payload only when the current material input still matches; any
 * changed quantity, customer, participant, or code context starts a fresh
 * checkout instead of replaying the old evidence.
 *
 * `expiresAt` mirrors the local end of the browser window of that attempt. It
 * stays optional for snapshots written before the deadline was mirrored: such
 * a snapshot is not immortal, the browser falls back to the known 15 minute
 * window counted from its own first save moment.
 */
export const ticketCheckoutRetryStoredSchema = v.object({
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  materialKey: v.pipe(v.string(), v.minLength(1), v.maxLength(8192)),
  checkoutKey: v.pipe(v.string(), v.regex(/^[A-Za-z0-9]{32,96}$/)),
  guestAccessToken: v.optional(v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{32,256}$/))),
  checkoutInput: v.looseObject({}),
  savedAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
  expiresAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
})

export type TicketCheckoutRetryStored = v.InferOutput<typeof ticketCheckoutRetryStoredSchema>

/**
 * Length of the mirrored browser window in milliseconds.
 *
 * The browser reservation of a code lasts 15 minutes from the first
 * successful reservation, so a retry snapshot never outlives that window.
 */
const retryWindowMs = 15 * 60 * 1000

/**
 * Local browser window of one retry snapshot.
 *
 * The deadline is counted in the client clock: a client clock that differs
 * from the server clock shifts the local window by that offset. The window is
 * a local mirror only, it never releases a code on the server and never
 * touches an order that already carries the code.
 */
export const ticketCheckoutRetryStoredWindow = {
  /** Length of the mirrored browser window in milliseconds. */
  ms: retryWindowMs,
  /**
   * Local deadline of one stored snapshot.
   *
   * The mirrored `expiresAt` may only shorten the window: the known 15
   * minute window counted from the first save moment always caps the
   * deadline, so a snapshot without a mirrored expiry still ends instead of
   * living forever.
   */
  deadline(record: TicketCheckoutRetryStored): number {
    const own = record.savedAt + retryWindowMs
    if (record.expiresAt === undefined) return own
    return Math.min(own, record.expiresAt)
  },
  /**
   * True when the snapshot is past its local deadline.
   *
   * The deadline is inclusive: at exactly 15 minutes after the first save the
   * snapshot is expired, one second earlier it is still live.
   */
  expired(record: TicketCheckoutRetryStored, now: number = Date.now()): boolean {
    return now >= ticketCheckoutRetryStoredWindow.deadline(record)
  },
}
