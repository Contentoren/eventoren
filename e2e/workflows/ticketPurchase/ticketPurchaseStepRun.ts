import { isDeepStrictEqual } from "node:util"
import { e2eCheckpointLoad } from "../../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointSave } from "../../checkpoint/e2eCheckpointSave.ts"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"

type Ticket = NonNullable<E2eCheckpoint["ticket"]>
const steps: Ticket["step"][] = [
  "ready",
  "event",
  "product",
  "publication",
  "checkout",
  "payment",
  "delivery",
  "pdf",
  "access",
  "checkin",
  "duplicate",
  "done",
]

/** Started writes are never repeated. Read-only assertions may be safely retried. */
export async function ticketPurchaseStepRun(
  context: TicketPurchaseContext,
  step: Ticket["step"],
  readOnly: boolean,
  action: (completed: boolean, record: (evidence: Partial<Ticket>) => Promise<void>) => Promise<void>,
): Promise<void> {
  const position = steps.indexOf(step)
  const current = steps.indexOf(context.checkpoint.ticket.step)
  if (current > position) {
    if (readOnly) await action(true, async () => {})
    return
  }
  if (current < position - 1 || (current === position - 1 && context.checkpoint.ticket.status !== "completed")) {
    throw new Error(`Cannot advance ticket workflow to ${step}; preceding step is uncertain`)
  }
  const completed = current === position && context.checkpoint.ticket.status === "completed"
  if (current === position && context.checkpoint.ticket.status === "started" && !readOnly) {
    throw new Error(`Ticket ${step} has an uncertain external effect; reconcile the exact run before retrying`)
  }
  const record = async (evidence: Partial<Ticket>) => {
    const stored = await e2eCheckpointLoad(context.directory, context.checkpoint)
    if (!stored.success || !stored.data || !isDeepStrictEqual(stored.data, context.checkpoint)) {
      throw new Error(`Ticket ${step} checkpoint changed; reconcile before continuing`)
    }
    const next: E2eCheckpoint = {
      ...context.checkpoint,
      ticket: { ...context.checkpoint.ticket, step, status: "started", ...evidence },
    }
    const saved = await e2eCheckpointSave(context.directory, next)
    if (!saved.success) throw new Error(saved.errorMessage)
    context.checkpoint = next as TicketPurchaseContext["checkpoint"]
  }
  if (current < position) await record({})
  await action(completed, completed ? async () => {} : record)
  if (!completed) await record({ status: "completed" })
}
