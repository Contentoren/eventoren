import { expect } from "@rstest/playwright"
import type { ConvexHttpClient } from "convex/browser"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseBillingReadinessProve } from "./ticketPurchaseBillingReadinessProve.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchasePublicationStep(
  context: TicketPurchaseContext,
  input: { client?: ConvexHttpClient; environment?: Record<string, string | undefined> } = {},
): Promise<void> {
  const { page, baseUrl } = context
  await ticketPurchaseStepRun(context, "publication", false, async (completed) => {
    await page.goto(`${baseUrl}/admin/events/${encodeURIComponent(context.checkpoint.ticket.eventKey)}`)
    if (!completed) {
      await page.getByRole("button", { name: "Veröffentlichen" }).click()
      await expect(page.getByRole("status")).toContainText("Event veröffentlicht", { timeout: 30_000 })
    }
    await expect(page.locator("#admin-event-status")).toHaveValue("published", { timeout: 30_000 })
    await ticketPurchaseBillingReadinessProve(context, input)
  })
}
