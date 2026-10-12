import { createResult, createResultError, type Result } from "#result"

/**
 * Prove persistent E2E ownership of a ticket order from its stored markers alone.
 * Never treat all records of the shared test user as test-created: the customer
 * name, event snapshot, test provider mode and creation time must agree on the run.
 */
export function catalogE2eOwnedOrderCheck(input: {
  eventTitle: string
  organizer: string
  customerGivenName: string | undefined
  customerFamilyName: string | undefined
  eventSnapshotTitle: string
  eventSnapshotOrganizer: string
  stripeMode: string
  status: string
  creationTime: number
  earliestCreationTime: number
  runId: string
}): Result<true> {
  const op = "catalogE2eOwnedOrderCheck"
  if (
    input.customerGivenName !== "E2E" ||
    input.customerFamilyName !== input.runId ||
    input.eventSnapshotTitle !== input.eventTitle ||
    input.eventSnapshotOrganizer !== input.organizer ||
    input.creationTime < input.earliestCreationTime
  )
    return createResultError(op, "Order is not a proven run-owned checkout; retain history")
  if (input.stripeMode !== "test") return createResultError(op, "Live Stripe order detected; no cleanup performed")
  if (input.status === "paid_inventory_conflict")
    return createResultError(op, "Conflicted paid order requires manual reconciliation")
  return createResult(true)
}
