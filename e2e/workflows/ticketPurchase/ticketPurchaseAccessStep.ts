import { expect } from "@rstest/playwright"
import { ticketE2eImapMessageWait } from "../../mail/ticketE2eImapMessageWait.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseAccessStep(context: TicketPurchaseContext): Promise<void> {
  await ticketPurchaseStepRun(context, "access", true, async () => {
    const email = await ticketE2eImapMessageWait({
      ...context.mail,
      purchaseMarker: context.checkpoint.ticket.eventTitle,
      since: new Date(context.checkpoint.ticket.mailSince),
      timeoutMs: 180_000,
      pollMs: 5_000,
      linkOrigin: context.baseUrl,
    })
    if (
      email.uid !== context.checkpoint.ticket.mailUid ||
      email.uidValidity !== context.checkpoint.ticket.mailUidValidity
    )
      throw new Error("Capability email UID differs from the checkpoint")
    const cleanContext = await context.browser.newContext()
    try {
      const page = await cleanContext.newPage()
      await page.goto(email.link.toString())
      await expect(
        page.getByRole("heading", { name: "Vielen Dank – dein Kauf war erfolgreich!", level: 1 }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(context.checkpoint.ticket.participantName)).toBeVisible()
      await expect(page.getByText("Bezahlt", { exact: true }).first()).toBeVisible({ timeout: 30_000 })
    } finally {
      await cleanContext.close()
    }
  })
}
