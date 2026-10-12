import type { Page } from "playwright"

const CARD_METHOD_WAIT_MS = 10_000
const CARD_METHOD_POLL_MS = 100

/**
 * Selects the card payment method on the Stripe TEST hosted form without any
 * financial effect. The delayed card accordion mounts asynchronously, so the
 * selector performs a bounded read-only wait until the legacy Karte radio,
 * the actual card fields (card-only form) or the visible card accordion
 * header exists before choosing: it never blind-sleeps-then-skips and never
 * submits. The legacy radio variant is kept first; the current classic
 * variant exposes no radio role and requires the visible card accordion
 * header click before the main-DOM card inputs assert. A card-only form (no
 * selector, card fields already present) proceeds without a click. When no
 * card method mounts within the bound, it fails closed without touching the
 * form.
 */
export async function ticketPurchaseCardMethodSelect(page: Page): Promise<void> {
  const deadline = Date.now() + CARD_METHOD_WAIT_MS
  for (;;) {
    let radioCount = 0
    try {
      radioCount = await page.getByRole("radio", { name: /karte/i }).count()
    } catch {
      radioCount = 0
    }
    if (
      radioCount > 0 &&
      (await page
        .getByRole("radio", { name: /karte/i })
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await page.getByRole("radio", { name: /karte/i }).first().check({ force: true })
      return
    }
    let cardFieldCount = 0
    try {
      cardFieldCount = await page.getByLabel(/card number|kartennummer/i).count()
    } catch {
      cardFieldCount = 0
    }
    if (
      cardFieldCount > 0 &&
      (await page
        .getByLabel(/card number|kartennummer/i)
        .first()
        .isVisible()
        .catch(() => false))
    )
      return
    try {
      const header = page.getByTestId("card-accordion-item").locator(".AccordionItemHeader--clickable")
      const headerCount = await header.count()
      if (headerCount > 0) {
        const first = header.first()
        const visible = await first.isVisible().catch(() => false)
        if (visible) {
          await first.click()
          return
        }
      }
    } catch {
      // A transient locator failure below never skips the choice: keep
      // polling read-only until the bound instead of blind-continuing.
    }
    if (Date.now() >= deadline) break
    await new Promise((resolve) => setTimeout(resolve, CARD_METHOD_POLL_MS))
  }
  throw new Error("Card payment method did not mount on the Stripe TEST form; reconcile manually")
}
