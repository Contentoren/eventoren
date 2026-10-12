import { createResult, createResultError, type Result } from "#result"

export const catalogE2eLegacyReadinessEventKey = "readiness-technical-draft-20260914"

const technicalSyncPattern = /synchron|technisch|technical|readiness|\bsync\b/i

/**
 * Prove ownership of the explicitly synchronization-only production readiness
 * fixture. The event key must match exactly and the stored description or image
 * must corroborate the technical sync purpose. A generic test title alone never
 * establishes ownership; without corroboration the row is retained for manual
 * reconciliation.
 */
export function catalogE2eLegacyReadinessCheck(input: {
  eventKey: string
  description: string
  imageUrl: string
}): Result<true> {
  const op = "catalogE2eLegacyReadinessCheck"
  if (input.eventKey !== catalogE2eLegacyReadinessEventKey)
    return createResultError(op, "Event key is not the approved readiness fixture")
  if (technicalSyncPattern.test(input.description) || input.imageUrl.includes("readiness-technical-draft"))
    return createResult(true)
  return createResultError(op, "Readiness fixture lacks technical sync corroboration; retain for manual reconciliation")
}
