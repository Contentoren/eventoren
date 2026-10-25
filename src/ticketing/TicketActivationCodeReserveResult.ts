/**
 * Answer of the browser-scoped activation-code reservation.
 *
 * `valid` is the only verdict: a foreign hold, an unknown code and a wrong
 * product all answer with the same generic invalid result. `holdToken` and
 * `expiresAt` are only present for the caller's own hold.
 */
export type TicketActivationCodeReserveResult = {
  readonly valid: boolean
  readonly holdToken?: string
  readonly expiresAt?: number
}
