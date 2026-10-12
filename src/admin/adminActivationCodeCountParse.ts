import { ticketActivationCodeLimits } from "#src/ticketing/ticketActivationCodeLimits.ts"

/** Parses the admin generation count input. Returns the count or null when invalid. */
export function adminActivationCodeCountParse(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d{1,7}$/u.test(trimmed)) return null
  const count = Number(trimmed)
  if (!Number.isSafeInteger(count) || count < 1 || count > ticketActivationCodeLimits.countMax) return null
  return count
}
