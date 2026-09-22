export function adminEuroFromCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) return ""
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`
}
