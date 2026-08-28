const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function ticketOrderCodeCreate(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length])
  return `EV-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`
}
