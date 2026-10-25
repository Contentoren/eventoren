/**
 * Browser hold credential: 32 CSPRNG bytes as 64 lowercase hex characters.
 *
 * The credential itself never reaches the database, only its digest does.
 * Hex encoding of random bytes carries no modulo bias.
 */
export function ticketActivationCodeHoldTokenCreate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}
