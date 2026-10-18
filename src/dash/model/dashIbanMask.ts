export function dashIbanMask(iban: string): string {
  const normalized = iban.replaceAll(/\s+/gu, "").toUpperCase()
  if (normalized.length < 8) return normalized
  return `${normalized.slice(0, 4)} •••• ${normalized.slice(-4)}`
}
