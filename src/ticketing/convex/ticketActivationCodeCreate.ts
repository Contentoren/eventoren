import { ticketActivationCodeLimits } from "#src/ticketing/ticketActivationCodeLimits.ts"

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const digits = "0123456789"
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

/** Largest byte bound below 256 for unbiased rejection sampling of the given range. */
function unbiasedByteLimitFor(range: number): number {
  return 256 - (256 % range)
}

/** Secure unbiased integer in [0, range) from platform CSPRNG entropy. */
function secureRandomInt(range: number): number {
  const limit = unbiasedByteLimitFor(range)
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    for (const byte of bytes) {
      if (byte >= limit) continue
      return byte % range
    }
  }
}

/**
 * Eight uppercase letters/digits from platform CSPRNG entropy.
 * First char is always a letter and one later position is always a digit,
 * so Excel/CSV keeps the textual identity instead of a numeric/scientific form.
 * Never derive from user values or log results.
 */
export function ticketActivationCodeCreate(): string {
  const codeLength = ticketActivationCodeLimits.length
  const digitPosition = secureRandomInt(codeLength - 1) + 1
  let code = letters[secureRandomInt(letters.length)] ?? "A"
  for (let index = 1; index < codeLength; index += 1) {
    if (index === digitPosition) {
      code += digits[secureRandomInt(digits.length)] ?? "0"
    } else {
      code += alphabet[secureRandomInt(alphabet.length)] ?? "A"
    }
  }
  return code
}
