const dashIdAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

export function dashIdCreate(prefix: string): string {
  const bytes = new Uint8Array(8)
  const crypto = (globalThis as { crypto?: { getRandomValues?: (bytes: Uint8Array) => void } }).crypto
  if (crypto?.getRandomValues) crypto.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  let suffix = ""
  for (const byte of bytes) suffix += dashIdAlphabet.charAt(byte % dashIdAlphabet.length)
  return `${prefix}-${suffix}`
}
