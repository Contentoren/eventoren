const searchNumericPattern = /^-?\d+$/

/**
 * Normalisiert einen numerischen Search-Param auf seinen String-Wert.
 *
 * TanStack parst Search-Params als JSON: Ein handgetipptes `?schritt=2` kommt
 * als Zahl `2` an, typisiertes `navigate({ search })` liefert den String `"2"`.
 * Beide Varianten werden auf den String normalisiert, damit Parser und
 * `validateSearch`-Funktionen nur einen Typ prüfen müssen.
 *
 * Mit `allowed` wird zusätzlich auf eine Wertemenge eingeschränkt
 * (z. B. `["1", "2", "3"]` für Wizard-Schritte): Nicht enthaltene Werte
 * ergeben `undefined` — ohne `allowed` gilt jede ganze Zahl.
 */
export function dashSearchNumericString<Allowed extends string>(
  raw: unknown,
  allowed: readonly Allowed[],
): Allowed | undefined
export function dashSearchNumericString(raw: unknown): string | undefined
export function dashSearchNumericString(raw: unknown, allowed?: readonly string[]): string | undefined {
  const value = typeof raw === "number" ? (Number.isInteger(raw) ? String(raw) : undefined) : raw
  if (typeof value !== "string" || value === "") return undefined
  if (allowed !== undefined) return allowed.includes(value) ? value : undefined
  if (!searchNumericPattern.test(value)) return undefined
  return value
}
