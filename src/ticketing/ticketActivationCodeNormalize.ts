/** Canonical code spelling: trimmed uppercase. Mirrors convex validation. */
export function ticketActivationCodeNormalize(input: string): string {
  return input.trim().toUpperCase()
}
