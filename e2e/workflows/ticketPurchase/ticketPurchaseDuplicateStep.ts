import { expect } from "@rstest/playwright"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"

export async function ticketPurchaseDuplicateStep(context: TicketPurchaseContext): Promise<void> {
  await ticketPurchaseStepRun(context, "duplicate", true, async () => {
    const { page } = context
    await ticketE2eAdminSignIn(page, context.baseUrl)
    await page.goto(`${context.baseUrl}/organizer/event/${encodeURIComponent(context.checkpoint.ticket.eventKey)}`)
    await expect(page.locator("#organizer-ticket-search")).toBeVisible({ timeout: 30_000 })
    await page.locator("#organizer-ticket-search").fill(context.checkpoint.ticket.participantName)
    await page.getByRole("button", { name: new RegExp(context.checkpoint.ticket.participantName) }).click()
    await expect(page.getByRole("button", { name: "Auschecken" }).first()).toBeEnabled()
    await expect(page.getByRole("button", { name: "Einchecken", exact: true })).toHaveCount(0)
  })
}
