import { ticketActivationCodeLimits } from "#src/ticketing/ticketActivationCodeLimits.ts"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
// 256 % 36 leaves a remainder of 4; reject those bytes to keep the distribution uniform.
const unbiasedByteLimit = 252

/** Eight uppercase letters/digits from platform CSPRNG entropy. Never derive from user values or log results. */
export function ticketActivationCodeCreate(): string {
  const codeLength = ticketActivationCodeLimits.length
  let code = ""
  while (code.length < codeLength) {
    const bytes = crypto.getRandomValues(new Uint8Array(codeLength * 2))
    for (const byte of bytes) {
      if (code.length >= codeLength) break
      if (byte >= unbiasedByteLimit) continue
      code += alphabet[byte % alphabet.length]
    }
  }
  return code
}
