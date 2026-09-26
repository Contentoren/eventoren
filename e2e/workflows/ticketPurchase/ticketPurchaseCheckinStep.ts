import { expect } from "@rstest/playwright"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseCheckinStep(context: TicketPurchaseContext): Promise<void> {
  await ticketPurchaseStepRun(context, "checkin", false, async (completed, record) => {
    const { page, baseUrl } = context
    const { eventKey, eventTitle, participantName } = context.checkpoint.ticket
    await ticketE2eAdminSignIn(page, baseUrl)
    await page.goto(`${baseUrl}/organizer/event/${encodeURIComponent(eventKey)}`)
    await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible({ timeout: 30_000 })
    await expect(page.locator("#organizer-ticket-search")).toBeVisible({ timeout: 30_000 })
    await page.locator("#organizer-ticket-search").fill(participantName)
    const row = page.getByRole("button", { name: new RegExp(participantName) })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await row.click()
    await expect(page).toHaveURL(/\bticket=/u)
    const ticketId = new URL(page.url()).searchParams.get("ticket")
    if (!ticketId || (context.checkpoint.ticket.ticketId && context.checkpoint.ticket.ticketId !== ticketId)) {
      throw new Error("Issued ticket ID does not match the observed organizer ticket")
    }
    if (!completed) {
      await page.getByRole("button", { name: "Einchecken" }).first().click()
      await expect(page.getByRole("status").getByText("Ticket wurde eingecheckt.", { exact: true })).toBeVisible({
        timeout: 30_000,
      })
    }
    await expect(row.getByText("Eingecheckt", { exact: true })).toBeVisible()
    if (!completed) await record({ ticketId })
    await page.reload()
    await expect(page.locator("#organizer-ticket-search")).toBeVisible({ timeout: 30_000 })
    await page.locator("#organizer-ticket-search").fill(participantName)
    await expect(row).toBeVisible({ timeout: 30_000 })
    await expect(row.getByText("Eingecheckt", { exact: true })).toBeVisible()
  })
}
