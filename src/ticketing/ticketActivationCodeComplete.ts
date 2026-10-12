import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

/** Complete code spelling: eight uppercase alphanumerics. Mirrors convex validation. */
export function ticketActivationCodeComplete(input: string): boolean {
  return /^[A-Z0-9]{8}$/.test(ticketActivationCodeNormalize(input))
}
