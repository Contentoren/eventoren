import { expect } from "@rstest/playwright"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseProductStep(context: TicketPurchaseContext): Promise<void> {
  const { page, baseUrl } = context
  const { eventKey } = context.checkpoint.ticket
  const productName = `Paid ticket ${context.checkpoint.runId}`
  await ticketPurchaseStepRun(context, "product", false, async (completed, record) => {
    await page.goto(`${baseUrl}/admin/events/${encodeURIComponent(eventKey)}?tab=products`)
    await expect(page.locator("form:has(#admin-tier-name)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    if (completed) {
      await expect(page.getByText(productName)).toBeVisible()
      return
    }
    const start = new Date(context.checkpoint.ticket.mailSince + 14 * 24 * 60 * 60_000)
    const end = new Date(start.getTime() + 3 * 60 * 60_000)
    const localDateTime = (date: Date) =>
      new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    await page.locator("#admin-tier-name").fill(productName)
    await page.locator("#admin-tier-capacity").fill("10")
    await page.locator("#admin-tier-price").fill("24.00")
    await page.locator("#admin-tier-fee").fill("0.00")
    await page.locator("#admin-tier-starts").fill(localDateTime(start))
    await page.locator("#admin-tier-ends").fill(localDateTime(end))
    await page.getByRole("button", { name: "Ticketprodukt speichern" }).click()
    await expect(page.getByRole("status")).toContainText("Ticketprodukt gespeichert", { timeout: 30_000 })
    await expect(page.getByText(productName)).toBeVisible()
    const tier = page
      .getByRole("list", { name: "Vorhandene Ticketprodukte" })
      .locator("li[draggable=true]")
      .filter({ hasText: productName })
    const productId = await tier.evaluate((item) => {
      const transfer = new DataTransfer()
      item.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: transfer }))
      return transfer.getData("text/plain")
    })
    if (!productId) throw new Error("Saved ticket product key could not be observed")
    await record({ productId })
  })
}
