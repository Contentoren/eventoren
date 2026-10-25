import * as v from "valibot"

/**
 * Public input of the browser-scoped activation-code reservation.
 *
 * The hold credential is optional: the first reservation mints one and hands
 * it to the browser, a repeated reservation proves ownership with the
 * credential it received. The deadline is server-owned, so no client
 * timestamp is part of this input.
 */
export const ticketActivationCodeReserveInputSchema = v.object({
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  tierKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  code: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64)),
  holdToken: v.optional(v.pipe(v.string(), v.minLength(16), v.maxLength(256))),
})

export type TicketActivationCodeReserveInput = v.InferOutput<typeof ticketActivationCodeReserveInputSchema>
