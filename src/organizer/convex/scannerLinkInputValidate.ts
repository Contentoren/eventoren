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
  if (!name || name.length > 120) return createResultError(op, "Name must be 1–120 characters")
  const now = Date.now()
  if (
    !Number.isSafeInteger(input.expiresAt) ||
    input.expiresAt <= now ||
    input.expiresAt > now + maxDurationMs ||
    (parentExpiresAt !== undefined && input.expiresAt > parentExpiresAt)
  ) {
    return createResultError(op, "Expiry must be in the future, within one year and no later than the parent")
  }
  if (
    input.eventKeys.length === 0 ||
    input.eventKeys.length > 50 ||
    new Set(input.eventKeys).size !== input.eventKeys.length
  ) {
    return createResultError(op, "Select 1–50 distinct events")
  }
  for (const eventKey of input.eventKeys) {
    if (!eventKey || eventKey.length > 200 || (allowedEventKeys && !allowedEventKeys.includes(eventKey))) {
      return createResultError(op, "Event is not allowed")
    }
    const event = await db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (!event || event.deletedAt || event.status !== "published") {
      return createResultError(op, "Event is not published or does not exist")
    }
  }
  return createResult({ name, eventKeys: input.eventKeys, expiresAt: input.expiresAt })
}
