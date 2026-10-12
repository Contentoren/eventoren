import { createResult, createResultError, type Result } from "#result"
import { catalogE2eRunMarkerExtract } from "./catalogE2eRunMarkerExtract.js"

/**
 * Prove persistent E2E ownership of a catalog event from its stored markers alone,
 * independent of any currently retained local checkpoint. Key, title and organizer
 * must agree on one exact run; a prefix or age alone never establishes ownership.
 */
export function catalogE2eOwnedEventCheck(input: {
  eventKey: string
  title: string
  organizer: string
}): Result<string> {
  const op = "catalogE2eOwnedEventCheck"
  const runId = catalogE2eRunMarkerExtract(input.eventKey)
  if (!runId.success) return runId
  if (input.title !== `Ticket E2E ${runId.data}` || input.organizer !== `Eventoren Ticket E2E ${runId.data}`)
    return createResultError(op, "Event key, title and organizer must match the exact run")
  return createResult(runId.data)
}
