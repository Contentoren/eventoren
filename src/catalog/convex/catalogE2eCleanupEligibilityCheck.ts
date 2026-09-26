import { createResult, createResultError } from "#result"

/** Only the catalog fixture's exact identity permits archival; timestamps alone never establish ownership. */
export function catalogE2eCleanupEligibilityCheck(input: {
  runId: string
  eventKey: string
  title: string
  organizer: string
  createdAt: number
  now: number
  runCreatedAt: number
  successfulOwnedCurrentRun: boolean
}) {
  const op = "catalogE2eCleanupEligibilityCheck"
  if (!/^[0-9a-z]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(input.runId))
    return createResultError(op, "Invalid run marker")
  if (
    input.eventKey !== `ticket-e2e-${input.runId}` ||
    input.title !== `Ticket E2E ${input.runId}` ||
    input.organizer !== `Eventoren Ticket E2E ${input.runId}`
  )
    return createResultError(op, "Event key, title and organizer must match the exact run")
  if (!Number.isSafeInteger(input.runCreatedAt) || input.runCreatedAt <= 0 || input.runCreatedAt > input.now)
    return createResultError(op, "Invalid run creation time")
  if (input.createdAt < input.runCreatedAt || input.createdAt > input.now)
    return createResultError(op, "Event was not created by this run")
  const day = 24 * 60 * 60_000
  if (input.now - input.createdAt < day && !(input.successfulOwnedCurrentRun && input.now - input.runCreatedAt < day))
    return createResultError(op, "Only stale or successful owned current-run events are eligible")
  return createResult(true)
}
