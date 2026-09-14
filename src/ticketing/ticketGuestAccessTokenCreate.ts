export function ticketGuestAccessTokenCreate(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    throw new Error("Secure browser randomness is unavailable")
  }
  const bytes = crypto.getRandomValues(new Uint8Array(48))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
}
