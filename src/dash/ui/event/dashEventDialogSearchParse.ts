import * as v from "valibot"
import { dashSearchNumericString } from "../../model/dashSearchNumericString.ts"
import { dashEventDialogSearchSchema, type DashEventDialogSearch } from "./dashEventDialogSearchSchema.ts"

const dashEventDialogKeys = ["veroeffentlichen", "duplizieren", "vorlage-speichern", "absagen"] as const

/**
 * Leniente Search-Parse für die Event-Dialog-Flags: ungültige Werte werden
 * verworfen statt zu werfen (z. B. `?absagen=foo` → `{}`).
 *
 * TanStack parst Search-Params als JSON: Ein handgetipptes `?duplizieren=1`
 * kommt als Zahl `1` an, typisiertes `navigate()` liefert den String `"1"`.
 * Beide Varianten öffnen den Dialog; intern als Zahl normalisiert, damit die
 * URLs sauber bleiben (`?duplizieren=1` statt `?duplizieren=%221%22`).
 */
export function dashEventDialogSearchParse(raw: Record<string, unknown>): DashEventDialogSearch {
  const output: DashEventDialogSearch = {}
  for (const key of dashEventDialogKeys) {
    if (dashSearchNumericString(raw[key], ["1"]) !== undefined) output[key] = 1
  }
  return v.parse(dashEventDialogSearchSchema, output)
}
