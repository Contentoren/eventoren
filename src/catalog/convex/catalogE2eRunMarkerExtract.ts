import { createResult, createResultError, type Result } from "#result"

const runIdPattern = /^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
const eventKeyPrefix = "ticket-e2e-"

/** Extract the run marker from an E2E event key. Prefix or age alone never establish ownership. */
export function catalogE2eRunMarkerExtract(eventKey: string): Result<string> {
  const op = "catalogE2eRunMarkerExtract"
  if (!eventKey.startsWith(eventKeyPrefix)) return createResultError(op, "Event key is not an E2E fixture marker")
  const runId = eventKey.slice(eventKeyPrefix.length)
  if (!runIdPattern.test(runId)) return createResultError(op, "Invalid run marker")
  return createResult(runId)
}
