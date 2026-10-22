import { createResult, createResultError, type Result } from "#result"
import { catalogE2eLegacyReadinessEventKey } from "./catalogE2eLegacyReadinessCheck.js"
import { catalogE2eLegacyTechnicalCheckoutEventKey } from "./catalogE2eLegacyTechnicalCheckoutCheck.js"
import { catalogE2eRunMarkerExtract } from "./catalogE2eRunMarkerExtract.js"

export type CatalogE2eTestLikeReason = "run-marker-key" | "legacy-key" | "native-auth-key" | "test-like-text"

export type CatalogE2eTestLike = {
  reason: CatalogE2eTestLikeReason
  runId: string | null
}

const e2eWordPattern = /\be2e\b/iu
const ticketE2ePattern = /ticket[\s\-_]*e2e/iu
const testTokenPattern = /(^|[\s\-_:])test($|[\s\-_:])/iu

function hasTestLikeText(value: string): boolean {
  return e2eWordPattern.test(value) || ticketE2ePattern.test(value) || testTokenPattern.test(value)
}

/**
 * Classify an event (or event-shaped order snapshot) as test-like.
 *
 * Exact run markers, legacy keys and native-auth keys always qualify so
 * previous-run fixtures with drifted titles stay in scope. Generic
 * test-like text (a standalone e2e word, a ticket-e2e phrase, or "test"
 * as a separate token in key/title/organizer) qualifies only as a
 * candidate: deletion still requires a fully test-proven graph (test-mode
 * orders only, no live revenue) through catalogE2eTestLikeGraphProve.
 *
 * Token boundaries are intentional: genuine titles such as "Testament",
 * "contest", "latest" or "Probetest" never qualify.
 */
export function catalogE2eTestLikeEventCheck(input: {
  eventKey: string
  title: string
  organizer: string
}): Result<CatalogE2eTestLike> {
  const op = "catalogE2eTestLikeEventCheck"
  const marker = catalogE2eRunMarkerExtract(input.eventKey)
  if (marker.success) return createResult({ reason: "run-marker-key" as const, runId: marker.data })
  if (
    input.eventKey === catalogE2eLegacyReadinessEventKey ||
    input.eventKey === catalogE2eLegacyTechnicalCheckoutEventKey
  )
    return createResult({ reason: "legacy-key" as const, runId: input.eventKey })
  if (input.eventKey.startsWith("native-auth-"))
    return createResult({ reason: "native-auth-key" as const, runId: input.eventKey })
  if (hasTestLikeText(input.eventKey) || hasTestLikeText(input.title) || hasTestLikeText(input.organizer))
    return createResult({ reason: "test-like-text" as const, runId: null })
  return createResultError(op, "No test-like marker: outside E2E cleanup classification")
}
