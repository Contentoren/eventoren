import { expect } from "@rstest/playwright"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseCheckoutEvidenceCheck } from "./ticketPurchaseCheckoutEvidenceCheck.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchaseCheckoutStep(context: TicketPurchaseContext): Promise<void> {
  const ticket = context.checkpoint.ticket
  if (
    (ticket.step === "checkout" && ticket.status === "completed") ||
    ["payment", "delivery", "pdf", "access", "checkin", "duplicate", "done"].includes(ticket.step)
  ) {
    await ticketPurchaseCheckoutEvidenceCheck(context)
    return
  }
  const { browser, baseUrl, mail } = context
  const { eventKey, eventTitle, participantName } = context.checkpoint.ticket
  await ticketPurchaseStepRun(context, "checkout", false, async (_completed, record) => {
    const guestContext = await browser.newContext()
    context.browserErrors.observe(guestContext)
    try {
      const page = await guestContext.newPage()
      context.guestContext = guestContext
      context.checkoutPage = page
      await page.goto(`${baseUrl}/events/${encodeURIComponent(eventKey)}`)
      await expect(page.getByRole("heading", { name: eventTitle, level: 1 })).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('main[data-hydrated="true"]')).toBeVisible({ timeout: 30_000 })
      await expect(
        page
          .getByRole("region", { name: "Tickets auswählen" })
          .getByRole("status", { name: /1 Tickets für Paid ticket/u }),
      ).toBeVisible({ timeout: 30_000 })
      const addToCart = page.getByRole("button", { name: "In den Warenkorb" }).first()
      await expect(addToCart).toBeEnabled()
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/warenkorb", { timeout: 30_000 }),
        addToCart.click(),
      ])
      await page
        .getByRole("complementary", { name: "Warenkorb-Zusammenfassung" })
        .getByRole("button", { name: "Zur Kasse", exact: true })
        .click()
      await expect(page.locator("#checkout-first-name")).toBeVisible()
      await expect(page.locator("form:has(#checkout-first-name)")).toHaveAttribute("data-hydrated", "true", {
        timeout: 30_000,
      })
      await page.locator("#checkout-first-name").fill("E2E")
      await page.locator("#checkout-last-name").fill(context.checkpoint.runId)
      await page.locator("#checkout-email").fill(mail.user)
      await page.locator("#checkout-address").fill("Teststraße 1, 10115 Berlin")
      await page.locator('input[name^="participant-"]').fill(participantName)
      await page.locator("#checkout-legal-acceptance").check()
      await page.getByRole("button", { name: "Weiter zur sicheren Zahlung" }).click()
      await expect(page).toHaveURL(/checkout\.stripe\.com/u, { timeout: 30_000 })
      const session = page.url().match(/\bcs_test_[A-Za-z0-9]+/u)?.[0]
      if (!session) throw new Error("Refusing payment: checkout is not a Stripe test session")
      // Only the session identifier, never the complete hosted URL or client secret.
      const state = await guestContext.storageState()
      const origin = state.origins.find((entry) => entry.origin === new URL(baseUrl).origin)
      const stored = origin?.localStorage.find((entry) => entry.name === "eventoren.ticketOrderAccess.v1")?.value
      const orders: unknown = stored ? JSON.parse(stored) : null
      if (
        !Array.isArray(orders) ||
        orders.length !== 1 ||
        !orders[0] ||
        typeof orders[0].orderId !== "string" ||
        !orders[0].orderId
      ) {
        await record({ stripeSession: session })
        throw new Error("Stripe test session created but exact order ID not observed; reconcile manually")
      }
      await record({ stripeSession: session, orderId: orders[0].orderId })
    } catch (error) {
      try {
        await guestContext.close()
      } catch (closeError) {
        throw new AggregateError([error, closeError], "Ticket checkout and guest context cleanup both failed")
      }
      throw error
    }
  })
}
