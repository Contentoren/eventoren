/** Bearer capability: 256 bits of CSPRNG entropy. Never log or derive from a user value. */
export function scannerLinkCodeCreate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}
