import { expect } from "@rstest/playwright"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseEventStep(context: TicketPurchaseContext): Promise<void> {
  const { page, baseUrl } = context
  const { eventTitle, eventKey } = context.checkpoint.ticket
  await ticketPurchaseStepRun(context, "event", false, async (completed, record) => {
    await ticketE2eAdminSignIn(page, baseUrl)
    if (completed) {
      await page.goto(`${baseUrl}/admin/events/${encodeURIComponent(eventKey)}`)
      await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible({ timeout: 30_000 })
      return
    }
    const runId = context.checkpoint.runId
    const start = new Date(context.checkpoint.ticket.mailSince + 14 * 24 * 60 * 60_000)
    const doors = new Date(start.getTime() - 30 * 60_000)
    const end = new Date(start.getTime() + 3 * 60 * 60_000)
    const localDateTime = (date: Date) =>
      new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
    await page.goto(`${baseUrl}/admin/events/new`)
    await expect(page.getByRole("heading", { name: "Neues Event" })).toBeVisible()
    await expect(page.locator("form:has(#admin-event-title)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    await page.locator("#admin-event-title").fill(eventTitle)
    await page.locator("#admin-event-subtitle").fill("Paid ticket purchase integration test")
    await page.locator("#admin-event-description").fill(`Paid ticket purchase E2E run ${runId}.`)
    await page.locator("#admin-event-organizer").fill(`Eventoren Ticket E2E ${runId}`)
    await page.locator("#admin-event-venue").fill(`Ticket E2E Test Hall ${runId}`)
    await page.locator("#admin-event-city").fill("Berlin")
    await page.locator("#admin-event-address").fill("Ticket E2E Teststraße 1, 10115 Berlin")
    await page.getByText("Erweitert", { exact: true }).click()
    await page.locator("#admin-event-key").fill(eventKey)
    await page.locator("#admin-event-starts").fill(localDateTime(start))
    await page.locator("#admin-event-doors").fill(localDateTime(doors))
    await page.locator("#admin-event-ends").fill(localDateTime(end))
    await page.getByRole("button", { name: "Änderungen speichern" }).click()
    await expect(page.getByRole("status").or(page.getByRole("alert")).first()).toBeVisible({ timeout: 30_000 })
    if (await page.getByRole("alert").count()) throw new Error("Admin reported an event creation error")
    await expect(page.getByRole("status")).toContainText("Event gespeichert", { timeout: 30_000 })
    // The admin catalog identifies saved events by their exact event key.
    await record({ eventId: eventKey })
  })
}
