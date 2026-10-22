import type { DatabaseReader } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

const maxDurationMs = 365 * 24 * 60 * 60 * 1000

export async function scannerLinkInputValidate(
  db: DatabaseReader,
  input: { name: string; eventKeys: string[]; expiresAt: number },
  allowedEventKeys?: readonly string[],
  parentExpiresAt?: number,
): PromiseResult<{ name: string; eventKeys: string[]; expiresAt: number }> {
  const op = "scannerLinkInputValidate"
  const name = input.name.trim()
  if (!name || name.length > 120) return createResultError(op, "Der Name muss 1–120 Zeichen lang sein.")
  const now = Date.now()
  if (
    !Number.isSafeInteger(input.expiresAt) ||
    input.expiresAt <= now ||
    input.expiresAt > now + maxDurationMs ||
    (parentExpiresAt !== undefined && input.expiresAt > parentExpiresAt)
  ) {
    return createResultError(
      op,
      "Das Ablaufdatum muss in der Zukunft, innerhalb eines Jahres und spätestens wie beim übergeordneten Link liegen.",
    )
  }
  if (
    input.eventKeys.length === 0 ||
    input.eventKeys.length > 50 ||
    new Set(input.eventKeys).size !== input.eventKeys.length
  ) {
    return createResultError(op, "Bitte 1–50 verschiedene Veranstaltungen wählen.")
  }
  for (const eventKey of input.eventKeys) {
    if (!eventKey || eventKey.length > 200 || (allowedEventKeys && !allowedEventKeys.includes(eventKey))) {
      return createResultError(op, "Diese Veranstaltung ist nicht zulässig.")
    }
    const event = await db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (!event || event.deletedAt || event.status !== "published") {
      return createResultError(op, "Die Veranstaltung ist nicht veröffentlicht oder existiert nicht.")
    }
  }
  return createResult({ name, eventKeys: input.eventKeys, expiresAt: input.expiresAt })
}
