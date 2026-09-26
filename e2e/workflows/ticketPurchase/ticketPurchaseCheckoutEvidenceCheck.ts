import { isDeepStrictEqual } from "node:util"
import { e2eCheckpointLoad } from "../../checkpoint/e2eCheckpointLoad.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"

/** A completed checkout is never reconstructed from a fresh cart or a guessed session. */
export async function ticketPurchaseCheckoutEvidenceCheck(context: TicketPurchaseContext): Promise<void> {
  const { ticket } = context.checkpoint
  if (!ticket.orderId || !/^cs_test_[A-Za-z0-9]+$/u.test(ticket.stripeSession ?? "")) {
    throw new Error("Completed checkout lacks the exact saved order and Stripe TEST session; reconcile manually")
  }
  const stored = await e2eCheckpointLoad(context.directory, context.checkpoint)
  if (!stored.success || !stored.data || !isDeepStrictEqual(stored.data, context.checkpoint)) {
    throw new Error("Saved checkout evidence changed; reconcile before continuing")
  }
}
