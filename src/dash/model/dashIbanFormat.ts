export function dashIbanFormat(iban: string): string {
  return iban
    .replaceAll(/\s+/gu, "")
    .toUpperCase()
    .replaceAll(/(.{4})/gu, "$1 ")
    .trimEnd()
}
