import { createResult, createResultError, type Result } from "#result"
import { adminEventReleaseDateTimeFromIso } from "./adminEventReleaseDateTimeFromIso.ts"

export function adminEventReleaseDateTimeToIso(value: string): Result<string> {
  const op = "adminEventReleaseDateTimeToIso"
  if (!value) return createResult("")
  const invalid = () => createResultError(op, "Bitte gib ein gültiges Datum mit Uhrzeit ein.")
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) return invalid()
  const wallTime = Date.parse(`${value}:00Z`)
  if (Number.isNaN(wallTime) || new Date(wallTime).toISOString().slice(0, 16) !== value) return invalid()

  let timestamp = wallTime
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const berlinTime = adminEventReleaseDateTimeFromIso(new Date(timestamp).toISOString())
    const offset = Date.parse(`${berlinTime}:00Z`) - timestamp
    timestamp = wallTime - offset
  }
  const iso = new Date(timestamp).toISOString()
  if (adminEventReleaseDateTimeFromIso(iso) !== value) return invalid()
  return createResult(iso)
}
