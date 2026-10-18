import { adminEventReleaseDateTimeFromIso } from "#src/admin/adminEventReleaseDateTimeFromIso.ts"
import { adminEventReleaseDateTimeToIso } from "#src/admin/adminEventReleaseDateTimeToIso.ts"

/** +7 Tage (gleiche Berliner Uhrzeit) für den Duplizieren-Dialog. */
export function dashEventDuplicateDefaultIso(startsAt: string | null): string | null {
  if (startsAt === null || !Number.isFinite(Date.parse(startsAt))) return null
  return new Date(Date.parse(startsAt) + 7 * 24 * 3_600_000).toISOString()
}

/** Wandelt eine ISO-Zeit in einen datetime-local-Wert (Berlin). */
export function dashStateDayBerlinMinuteRound(iso: string | null): string {
  if (iso === null) return ""
  return adminEventReleaseDateTimeFromIso(iso)
}

/** Wandelt einen datetime-local-Wert (Berlin) zurück in ISO. */
export function dashEventDialogsLocalToIso(local: string): string | null {
  if (!local) return null
  const result = adminEventReleaseDateTimeToIso(local)
  return result.success ? (result.data === "" ? null : result.data) : null
}
