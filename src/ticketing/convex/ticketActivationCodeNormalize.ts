/** Canonical code spelling: trimmed uppercase. Validation stays idempotent on normalized input. */
export function ticketActivationCodeNormalize(input: string): string {
  return input.trim().toUpperCase()
}
