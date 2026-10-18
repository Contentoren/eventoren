export function dashDateTimeSplit(localValue: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(localValue)
  if (!match) return { date: "", time: "" }
  return { date: match[1] ?? "", time: match[2] ?? "" }
}

/**
 * Fügt Datums- und Uhrzeit-Teil eines datetime-local-Werts zusammen.
 * Leeres Datum ergibt "" (→ onChange(null)). Zeit leer + Datum gesetzt
 * nutzt den Fallback (Standard "20:00" für neue Werte).
 */
export function dashDateTimeJoin(date: string, time: string, fallbackTime = "20:00"): string {
  if (!date) return ""
  return `${date}T${time || fallbackTime}`
}
