export function ticketCheckoutSearchOrderIdsParse(value: string | undefined): readonly string[] {
  if (!value) return []
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}
