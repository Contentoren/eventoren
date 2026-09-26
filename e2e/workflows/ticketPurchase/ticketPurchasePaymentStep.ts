import { expect } from "@rstest/playwright"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseCheckoutEvidenceCheck } from "./ticketPurchaseCheckoutEvidenceCheck.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

export async function ticketPurchasePaymentStep(context: TicketPurchaseContext): Promise<void> {
  if (
    (context.checkpoint.ticket.step === "payment" && context.checkpoint.ticket.status === "completed") ||
    ["delivery", "pdf", "access", "checkin", "duplicate", "done"].includes(context.checkpoint.ticket.step)
  ) {
    await ticketPurchaseCheckoutEvidenceCheck(context)
    return
  }
  if (context.checkpoint.ticket.step === "checkout" && context.checkpoint.ticket.status === "completed") {
    await ticketPurchaseCheckoutEvidenceCheck(context)
    if (!context.checkoutPage)
      throw new Error(
        "Checkout exists but the hosted session is no longer open; reconcile Stripe TEST and the order before payment retry",
      )
  }
  await ticketPurchaseStepRun(context, "payment", false, async () => {
    const page = context.checkoutPage
    const session = context.checkpoint.ticket.stripeSession
    let url: URL | undefined
    try {
      if (page) url = new URL(page.url())
    } catch {
      // An unavailable browser URL is not evidence that the saved session is still open.
    }
    if (
      !page ||
      !session ||
      !context.checkpoint.ticket.orderId ||
      url?.origin !== "https://checkout.stripe.com" ||
      !url.pathname.split("/").includes(session)
    ) {
      throw new Error("Exact test checkout session and order must be observed before card entry")
    }
    await page.getByRole("radio", { name: /karte/i }).check({ force: true })
    await expect(page.getByLabel(/card number|kartennummer/i)).toBeVisible()
    await page.getByLabel(/card number|kartennummer/i).fill("4242424242424242")
    await page.getByLabel(/expiration date|expiry|gültig bis/i).fill("1234")
    await page.getByRole("textbox", { name: /cvc\/cvv/i }).fill("123")
    await page.getByLabel(/cardholder|karteninhaber/i).fill("E2E Ticket Test")
    await page.getByText("Adresse manuell eingeben", { exact: true }).click()
    await page.locator('input[name="billingAddressLine1"]').fill("Teststraße 1")
    await page.locator('input[name="billingLocality"]').fill("Berlin")
    await page.locator('input[name="billingPostalCode"]').fill("10115")
    const postalCode = page.getByLabel(/zip|postal code/i)
    if ((await postalCode.count()) > 0 && (await postalCode.isVisible())) await postalCode.fill("10115")
    await page.getByTestId("hosted-payment-submit-button").click()
    await expect(page).toHaveURL(/\/checkout(?:\?|#)/u, { timeout: 90_000 })
    await expect(page.getByText("Bezahlt", { exact: true }).first()).toBeVisible({ timeout: 180_000 })
  })
  await context.guestContext?.close()
  context.guestContext = undefined
  context.checkoutPage = undefined
}
