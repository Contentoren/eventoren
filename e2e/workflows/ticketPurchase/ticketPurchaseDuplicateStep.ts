import { expect } from "@rstest/playwright"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseDuplicateStep(context: TicketPurchaseContext, code: string): Promise<void> {
  await ticketPurchaseStepRun(context, "duplicate", true, async () => {
    const { page } = context
    await page.locator("#organizer-ticket-code").fill(code)
    await page.getByRole("button", { name: "Ticket-Code prüfen" }).click()
    await expect(page.getByText("Dieses Ticket wurde bereits eingecheckt.").first()).toBeVisible({ timeout: 30_000 })
  })
}
