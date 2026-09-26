import { createHash } from "node:crypto"
import { expect } from "@rstest/playwright"
import { ticketE2eImapMessageWait } from "../../mail/ticketE2eImapMessageWait.ts"
import { ticketE2ePdfInspect } from "../../pdf/ticketE2ePdfInspect.ts"
import { ticketE2ePdfTextNormalize } from "../../pdf/ticketE2ePdfTextNormalize.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchasePdfStep(context: TicketPurchaseContext): Promise<string> {
  let code = ""
  await ticketPurchaseStepRun(context, "pdf", true, async (_completed, record) => {
    const email = await ticketE2eImapMessageWait({
      ...context.mail,
      purchaseMarker: context.checkpoint.ticket.eventTitle,
      since: new Date(context.checkpoint.ticket.mailSince),
      timeoutMs: 180_000,
      pollMs: 5_000,
      linkOrigin: context.baseUrl,
    })
    if (email.uid !== context.checkpoint.ticket.mailUid)
      throw new Error("PDF message does not match checkpointed IMAP UID")
    const attachment = email.attachments.find(
      (item) => item.contentType === "application/pdf" || item.filename.toLowerCase().endsWith(".pdf"),
    )
    if (!attachment) throw new Error("The matching IMAP email contained no PDF ticket attachment")
    const hash = createHash("sha256").update(attachment.content).digest("hex")
    if (
      (context.checkpoint.ticket.pdfFilename && context.checkpoint.ticket.pdfFilename !== attachment.filename) ||
      (context.checkpoint.ticket.pdfSha256 && context.checkpoint.ticket.pdfSha256 !== hash)
    ) {
      throw new Error("PDF identity changed; reconcile before continuing")
    }
    const pdf = await ticketE2ePdfInspect(attachment.content)
    const text = ticketE2ePdfTextNormalize(pdf.text)
    expect(text).toContain(context.checkpoint.ticket.eventTitle)
    expect(text).toContain(context.checkpoint.ticket.participantName)
    expect(pdf.decodedQrPayloads).toHaveLength(1)
    code = pdf.decodedQrPayloads[0] ?? ""
    if (!/^TKT-[0-9A-F]{20}$/u.test(code)) throw new Error("Rendered ticket PDF has no valid issued-ticket QR")
    await record({ pdfFilename: attachment.filename, pdfSha256: hash })
  })
  return code
}
