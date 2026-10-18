export function dashMoneyParse(raw: string): number | null {
  const normalized = raw.trim().replaceAll(/\s/gu, "")
  if (!normalized) return null
  if (!/^\d+(?:[.,]\d{1,2})?$/u.test(normalized)) return null
  const [whole, fraction = ""] = normalized.split(/[.,]/u)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  if (!Number.isSafeInteger(cents)) return null
  return cents
}
