/**
 * Pure IBAN validity check (ISO 13616 mod-97). No I/O, no store access,
 * so it is reusable from valibot schemas, convex functions, and tests.
 */
export function organizerDashboardIbanValidate(iban: string): boolean {
  const normalized = iban.replace(/[\s-]+/g, "").toUpperCase()
  if (!/^[A-Z0-9]+$/.test(normalized)) return false
  if (normalized.length < 15 || normalized.length > 34) return false
  const rearranged = normalized.slice(4) + normalized.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const code = char >= "A" && char <= "Z" ? String(char.charCodeAt(0) - 55) : char
    for (const digit of code) {
      remainder = (remainder * 10 + Number(digit)) % 97
    }
  }
  return remainder === 1
}
