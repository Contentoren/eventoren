export function adminEuroToCents(value: string): number | null {
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/u.exec(value.trim())
  if (!match) return null

  const wholeEuros = Number(match[1])
  const decimalCents = Number((match[2] ?? "").padEnd(2, "0"))
  const cents = wholeEuros * 100 + decimalCents
  return Number.isSafeInteger(cents) ? cents : null
}
