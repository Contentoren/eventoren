import { expect } from "@rstest/playwright"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseDuplicateStep(context: TicketPurchaseContext): Promise<void> {
  await ticketPurchaseStepRun(context, "duplicate", true, async () => {
    const { page } = context
    await page.getByRole("button", { name: new RegExp(context.checkpoint.ticket.participantName) }).click()
    await expect(page.getByRole("button", { name: "Auschecken" }).first()).toBeEnabled()
    await expect(page.getByRole("button", { name: "Einchecken" }).first()).toBeDisabled()
  })
}
