import { createResult, createResultError } from "#result"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"

type CleanupInput = {
  runId: string
  eventKey: string
  eventTitle: string
  organizer: string
  eventId?: string
  productId?: string
  orderId?: string
  ticketId?: string
  participantName: string
  runCreatedAt: number
  successfulOwnedCurrentRun: boolean
}

/** Scan private target-bound state; never infer ownership from a prefix or age alone. */
export async function e2eCatalogCleanupScan(input: {
  directory: string
  target: Pick<E2eCheckpoint, "target" | "baseUrl">
  now?: number
  cleanup: (fixture: CleanupInput) => Promise<{ success: boolean; errorMessage?: string; data?: unknown }>
}) {
  const op = "e2eCatalogCleanupScan"
  const stored = await e2eCheckpointLoad(input.directory, input.target)
  if (!stored.success) return stored
  const checkpoint = stored.data
  if (!checkpoint || !checkpoint.ticket || checkpoint.phase !== "ticket-unreconciled")
    return createResult({ status: "no-fixture" as const })
  const ticket = checkpoint.ticket
  if (
    ticket.eventKey !== `ticket-e2e-${checkpoint.runId}` ||
    ticket.eventTitle !== `Ticket E2E ${checkpoint.runId}` ||
    ticket.participantName !== `E2E Participant ${checkpoint.runId}` ||
    (ticket.eventId && ticket.eventId !== ticket.eventKey)
  )
    return createResultError(op, "Checkpoint does not identify one exact owned event")
  const now = input.now ?? Date.now()
  const stale = now - checkpoint.createdAt >= 24 * 60 * 60_000
  const successful = !stale && ticket.step === "done" && ticket.status === "completed"
  if (!stale && !successful) return createResult({ status: "preserved-current-run" as const })
  if (ticket.step === "ready") return createResult({ status: "no-fixture" as const })
  const result = await input.cleanup({
    runId: checkpoint.runId,
    eventKey: ticket.eventKey,
    eventTitle: ticket.eventTitle,
    organizer: `Eventoren Ticket E2E ${checkpoint.runId}`,
    eventId: ticket.eventId,
    productId: ticket.productId,
    orderId: ticket.orderId,
    ticketId: ticket.ticketId,
    participantName: ticket.participantName,
    runCreatedAt: checkpoint.createdAt,
    successfulOwnedCurrentRun: successful,
  })
  if (!result.success) return createResultError(op, result.errorMessage ?? "Catalog cleanup could not be verified")
  // Catalog archival does not reconcile retained orders/tickets or Stripe, mail and PDF artifacts.
  // Deliberately keep the checkpoint for the other cleanup increments.
  return createResult({ status: "catalog-archived-checkpoint-retained" as const, verification: result.data })
}
