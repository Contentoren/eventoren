import { createResult, createResultError } from "#result"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eStripeTicketReconcile } from "./e2eStripeTicketReconcile.ts"

/** End-of-invocation sweep; incomplete current runs remain resumable. */
export async function e2eStripeCleanupScan(input: {
  directory: string
  target: Pick<E2eCheckpoint, "target" | "baseUrl">
  now?: number
  reconcile: typeof e2eStripeTicketReconcile
  config?: Omit<Parameters<typeof e2eStripeTicketReconcile>[0], "checkpoint">
}) {
  const op = "e2eStripeCleanupScan"
  const stored = await e2eCheckpointLoad(input.directory, input.target)
  if (!stored.success) return stored
  const checkpoint = stored.data
  if (!checkpoint?.ticket || checkpoint.phase !== "ticket-unreconciled")
    return createResult({ status: "no-fixture" as const })
  const ticket = checkpoint.ticket
  if (
    ticket.eventKey !== `ticket-e2e-${checkpoint.runId}` ||
    ticket.eventTitle !== `Ticket E2E ${checkpoint.runId}` ||
    ticket.participantName !== `E2E Participant ${checkpoint.runId}`
  )
    return createResultError(op, "Exact run ownership is uncertain")
  if (
    (input.now ?? Date.now()) - checkpoint.createdAt < 24 * 60 * 60_000 &&
    !(ticket.step === "done" && ticket.status === "completed")
  )
    return createResult({ status: "preserved-current-run" as const })
  if (["ready", "event", "product", "publication"].includes(ticket.step) && !ticket.stripeSession && !ticket.orderId)
    return createResult({ status: "no-checkout-observed" as const })
  if (!ticket.stripeSession || !ticket.orderId || !input.config)
    return createResultError(
      op,
      "Checkout or explicit Stripe TEST/organization/app credentials missing; checkpoint retained",
    )
  return input.reconcile({ ...input.config, checkpoint })
}
