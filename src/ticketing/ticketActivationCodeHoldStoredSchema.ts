import * as v from "valibot"

/**
 * Browser-side record of the caller's own activation-code hold credential.
 * The credential itself is opaque to the client; expiry stays server-owned,
 * so the client never enforces a deadline from this record.
 *
 * `expiresAt` stays optional for records that were persisted before the
 * server deadline was mirrored. Such a record is not immortal: the browser
 * falls back to the known 15 minute window counted from its own save moment.
 */
export const ticketActivationCodeHoldStoredSchema = v.object({
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  tierKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  code: v.pipe(v.string(), v.trim(), v.toUpperCase(), v.regex(/^[A-Z0-9]{8}$/)),
  holdToken: v.pipe(v.string(), v.minLength(16), v.maxLength(256)),
  expiresAt: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  savedAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export type TicketActivationCodeHoldStored = v.InferOutput<typeof ticketActivationCodeHoldStoredSchema>
