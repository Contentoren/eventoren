import { ticketE2eImapMessageWait } from "../../mail/ticketE2eImapMessageWait.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseDeliveryStep(context: TicketPurchaseContext): Promise<void> {
  await ticketPurchaseStepRun(context, "delivery", true, async (_completed, record) => {
    const email = await ticketE2eImapMessageWait({
      ...context.mail,
      purchaseMarker: context.checkpoint.ticket.eventTitle,
      since: new Date(context.checkpoint.ticket.mailSince),
      timeoutMs: 180_000,
      pollMs: 5_000,
      linkOrigin: context.baseUrl,
    })
    if (
      (context.checkpoint.ticket.mailUid && context.checkpoint.ticket.mailUid !== email.uid) ||
      (context.checkpoint.ticket.mailUidValidity && context.checkpoint.ticket.mailUidValidity !== email.uidValidity)
    ) {
      throw new Error("Matching mail UID changed; reconcile before continuing")
    }
    await record({ mailUid: email.uid, mailUidValidity: email.uidValidity })
  })
}
