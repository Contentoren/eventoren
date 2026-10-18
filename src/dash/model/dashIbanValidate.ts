import { createResult, createResultError, type Result } from "#result"

const dashIbanLengths: Record<string, number> = {
  AL: 28,
  AT: 20,
  BE: 16,
  BG: 22,
  CH: 21,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  EE: 20,
  ES: 24,
  FI: 18,
  FR: 27,
  GB: 22,
  GI: 23,
  GR: 27,
  HR: 21,
  HU: 28,
  IE: 22,
  IS: 26,
  IT: 27,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  MC: 27,
  MT: 31,
  NL: 18,
  NO: 15,
  PL: 28,
  PT: 25,
  RO: 24,
  SE: 24,
  SI: 19,
  SK: 24,
}

export function dashIbanValidate(input: string): Result<string> {
  const op = "dashIbanValidate"
  const normalized = input.replaceAll(/\s+/gu, "").toUpperCase()
  if (normalized.length < 2) return createResultError(op, "IBAN ist zu kurz")
  const country = normalized.slice(0, 2)
  if (!/^[A-Z]{2}$/u.test(country)) return createResultError(op, "IBAN muss mit zwei Buchstaben beginnen")
  const expected = dashIbanLengths[country]
  if (expected === undefined) return createResultError(op, "Unbekanntes Länderkürzel")
  if (!/^[A-Z0-9]+$/u.test(normalized)) return createResultError(op, "IBAN darf nur Buchstaben und Ziffern enthalten")
  if (normalized.length < expected) return createResultError(op, "IBAN ist zu kurz")
  if (normalized.length > expected) return createResultError(op, "IBAN ist zu lang")
  const rearranged = normalized.slice(4) + normalized.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const code = char >= "0" && char <= "9" ? char.charCodeAt(0) - 48 : char.charCodeAt(0) - 55
    for (const digit of String(code)) remainder = (remainder * 10 + Number(digit)) % 97
  }
  if (remainder !== 1) return createResultError(op, "Prüfziffer stimmt nicht")
  return createResult(normalized)
}
