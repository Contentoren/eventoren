import { createResult, createResultError, type Result } from "#result"

const duplicateKeyAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

export function catalogEventDuplicateKeyCreate(
  sourceEventKey: string,
  random: () => number,
  nowMs: number,
): Result<string> {
  const op = "catalogEventDuplicateKeyCreate"
  if (sourceEventKey.trim().length === 0) return createResultError(op, "Event key is required")
  const slug = sourceEventKey
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "")
  const fallback = slug.length > 0 ? slug : "event"
  let suffix = ""
  for (let index = 0; index < 6; index += 1) {
    suffix += duplicateKeyAlphabet[Math.floor(random() * duplicateKeyAlphabet.length)] ?? "a"
  }
  return createResult(`${fallback}-kopie-${nowMs.toString(36)}${suffix}`)
}
