import { mkdir } from "node:fs/promises"
import { expect, test } from "@rstest/playwright"
import type { Page } from "playwright"
import { e2eEnvironmentRead } from "../config/e2eEnvironmentRead.ts"
import { ticketE2eImapMessageWait } from "../mail/ticketE2eImapMessageWait.ts"
import { ticketE2ePdfInspect } from "../pdf/ticketE2ePdfInspect.ts"
import { ticketE2ePdfTextNormalize } from "../pdf/ticketE2ePdfTextNormalize.ts"
import { ticketE2eAdminSignIn } from "./ticketE2eAdminSignIn.ts"

const environmentResult = e2eEnvironmentRead(process.env)
if (!environmentResult.success) throw new Error(environmentResult.errorMessage)
const environment = environmentResult.data

test("testadmin can reach the real admin event catalog", { timeout: 90_000 }, async ({ page }) => {
  await ticketE2eAdminSignIn(page, environment.baseUrl)
  await expect(page.getByRole("heading", { name: /events/i })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("link", { name: /event erstellen|neues event/i })).toBeVisible()
})

test("creates, sells, delivers, opens, checks in, and rejects a duplicate paid ticket", { timeout: 600_000 }, async ({
  page,
  browser,
}) => {
  const mail = ticketE2eMailboxRead(environment.mailcow)
  const runToken = `${Date.now().toString(36)}-${crypto.randomUUID()}`
  const eventTitle = `Ticket E2E ${runToken}`
  const eventKey = `ticket-e2e-${runToken}`
  const participantName = `E2E Participant ${runToken}`
  const start = new Date(Date.now() + 14 * 24 * 60 * 60_000)
  const doors = new Date(start.getTime() - 30 * 60_000)
  const end = new Date(start.getTime() + 3 * 60 * 60_000)
  const mailSince = new Date()
  let stage = "event-creation"
  let checkoutPage: Page = page

  try {
    await ticketE2eAdminSignIn(page, environment.baseUrl)
    await page.goto(`${environment.baseUrl}/admin/events/new`)
    await expect(page.getByRole("heading", { name: "Neues Event" })).toBeVisible()
    // SSR makes the inputs visible before Solid has attached their onInput handlers.
    await expect(page.locator("form:has(#admin-event-title)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    await page.locator("#admin-event-title").fill(eventTitle)
    await page.locator("#admin-event-subtitle").fill("Paid ticket purchase integration test")
    await page.locator("#admin-event-description").fill(`Paid ticket purchase E2E run ${runToken}.`)
    await page.locator("#admin-event-organizer").fill(`Eventoren Ticket E2E ${runToken}`)
    await page.locator("#admin-event-venue").fill(`Ticket E2E Test Hall ${runToken}`)
    await page.locator("#admin-event-city").fill("Berlin")
    await page.locator("#admin-event-address").fill("Ticket E2E Teststraße 1, 10115 Berlin")
    await page.getByText("Erweitert", { exact: true }).click()
    await page.locator("#admin-event-key").fill(eventKey)
    await page.locator("#admin-event-starts").fill(ticketE2eLocalDateTime(start))
    await page.locator("#admin-event-doors").fill(ticketE2eLocalDateTime(doors))
    await page.locator("#admin-event-ends").fill(ticketE2eLocalDateTime(end))
    await page.getByRole("button", { name: "Änderungen speichern" }).click()
    await expect(page.getByRole("status").or(page.getByRole("alert")).first()).toBeVisible({ timeout: 30_000 })
    if (await page.getByRole("alert").count()) throw new Error("Admin reported an event creation error")
    await expect(page.getByRole("status")).toContainText("Event gespeichert", { timeout: 30_000 })

    stage = "ticket-product-creation"
    await page.goto(`${environment.baseUrl}/admin/events/${encodeURIComponent(eventKey)}?tab=products`)
    await expect(page.locator("form:has(#admin-tier-name)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    await page.locator("#admin-tier-name").fill(`Paid ticket ${runToken}`)
    await page.locator("#admin-tier-capacity").fill("10")
    await page.locator("#admin-tier-price").fill("24.00")
    await page.locator("#admin-tier-fee").fill("0.00")
    await page.locator("#admin-tier-starts").fill(ticketE2eLocalDateTime(start))
    await page.locator("#admin-tier-ends").fill(ticketE2eLocalDateTime(end))
    await page.getByRole("button", { name: "Ticketprodukt speichern" }).click()
    await expect(page.getByRole("status")).toContainText("Ticketprodukt gespeichert", { timeout: 30_000 })
    await expect(page.getByText(`Paid ticket ${runToken}`)).toBeVisible()

    stage = "event-publication"
    await page.goto(`${environment.baseUrl}/admin/events/${encodeURIComponent(eventKey)}`)
    await page.getByRole("button", { name: "Veröffentlichen" }).click()
    await expect(page.locator("#admin-event-status")).toHaveValue("published", { timeout: 30_000 })
    await expect(page.getByRole("status")).toContainText("Event veröffentlicht", { timeout: 30_000 })

    stage = "checkout"
    const guestContext = await browser.newContext()
    checkoutPage = await guestContext.newPage()
    await checkoutPage.goto(`${environment.baseUrl}/events/${encodeURIComponent(eventKey)}`)
    await expect(checkoutPage.getByRole("heading", { name: eventTitle, level: 1 })).toBeVisible({ timeout: 30_000 })
    await expect(checkoutPage.locator('main[data-hydrated="true"]')).toBeVisible({ timeout: 30_000 })
    await expect(
      checkoutPage
        .getByRole("region", { name: "Tickets auswählen" })
        .getByRole("status", { name: /1 Tickets für Paid ticket/u }),
    ).toBeVisible({ timeout: 30_000 })
    const addToCart = checkoutPage.getByRole("button", { name: "In den Warenkorb" }).first()
    await expect(addToCart).toBeEnabled()
    await Promise.all([
      checkoutPage.waitForURL((url) => url.pathname === "/warenkorb", { timeout: 30_000 }),
      addToCart.click(),
    ])
    await checkoutPage
      .getByRole("complementary", { name: "Warenkorb-Zusammenfassung" })
      .getByRole("button", { name: "Zur Kasse", exact: true })
      .click()
    await expect(checkoutPage.locator("#checkout-first-name")).toBeVisible()
    await expect(checkoutPage.locator("form:has(#checkout-first-name)")).toHaveAttribute("data-hydrated", "true", {
      timeout: 30_000,
    })
    await checkoutPage.locator("#checkout-first-name").fill("E2E")
    await checkoutPage.locator("#checkout-last-name").fill(runToken)
    await checkoutPage.locator("#checkout-email").fill(mail.user)
    await checkoutPage.locator("#checkout-address").fill("Teststraße 1, 10115 Berlin")
    await checkoutPage.locator('input[name^="participant-"]').fill(participantName)
    await checkoutPage.locator("#checkout-legal-acceptance").check()
    await checkoutPage.getByRole("button", { name: "Weiter zur sicheren Zahlung" }).click()

    stage = "checkout-creation"
    // Stripe Checkout uses the same hostname in both modes: only submit a card on a test-session URL.
    try {
      await expect(checkoutPage).toHaveURL(/checkout\.stripe\.com/u, { timeout: 30_000 })
    } catch (error) {
      const alert = await checkoutPage.getByRole("alert").allTextContents()
      throw new Error(`Guest checkout creation failed: ${alert.join("; ") || "no checkout error shown"}`, {
        cause: error,
      })
    }
    const stripeUrl = checkoutPage.url()
    if (!/\bcs_test_[A-Za-z0-9]+/u.test(stripeUrl)) {
      throw new Error(`Refusing to enter a payment card on a non-test Stripe session: ${new URL(stripeUrl).origin}`)
    }
    stage = "stripe-payment-method-select"
    await checkoutPage.getByRole("radio", { name: /karte/i }).check({ force: true })
    stage = "stripe-card-number-fill"
    await expect(checkoutPage.getByLabel(/card number|kartennummer/i)).toBeVisible()
    await checkoutPage.getByLabel(/card number|kartennummer/i).fill("4242424242424242")
    stage = "stripe-expiration-fill"
    await checkoutPage.getByLabel(/expiration date|expiry|gültig bis/i).fill("1234")
    stage = "stripe-security-code-fill"
    await checkoutPage.getByRole("textbox", { name: /cvc\/cvv/i }).fill("123")
    stage = "stripe-cardholder-fill"
    await checkoutPage.getByLabel(/cardholder|karteninhaber/i).fill("E2E Ticket Test")
    stage = "stripe-billing-address"
    await checkoutPage.getByText("Adresse manuell eingeben", { exact: true }).click()
    await checkoutPage.locator('input[name="billingAddressLine1"]').fill("Teststraße 1")
    await checkoutPage.locator('input[name="billingLocality"]').fill("Berlin")
    await checkoutPage.locator('input[name="billingPostalCode"]').fill("10115")
    stage = "stripe-postal-code-check"
    const postalCode = checkoutPage.getByLabel(/zip|postal code/i)
    if ((await postalCode.count()) > 0 && (await postalCode.isVisible())) {
      stage = "stripe-postal-code-fill"
      await postalCode.fill("10115")
    }
    stage = "stripe-submit"
    await checkoutPage.getByTestId("hosted-payment-submit-button").click()

    await expect(checkoutPage).toHaveURL(/\/checkout(?:\?|#)/u, { timeout: 90_000 })
    stage = "paid-order-confirmation"
    await expect(checkoutPage.getByText("Bezahlt", { exact: true }).first()).toBeVisible({ timeout: 180_000 })

    stage = "ticket-email-and-pdf"
    const email = await ticketE2eImapMessageWait({
      ...mail,
      purchaseMarker: eventTitle,
      since: mailSince,
      timeoutMs: 180_000,
      pollMs: 5_000,
      linkOrigin: environment.baseUrl,
    })
    const pdfAttachment = email.attachments.find(
      (attachment) =>
        attachment.contentType === "application/pdf" || attachment.filename.toLowerCase().endsWith(".pdf"),
    )
    if (!pdfAttachment) throw new Error("The matching IMAP email contained no PDF ticket attachment")
    const pdf = await ticketE2ePdfInspect(pdfAttachment.content)
    const normalizedPdfText = ticketE2ePdfTextNormalize(pdf.text)
    expect(normalizedPdfText).toContain(eventTitle)
    expect(normalizedPdfText).toContain(participantName)
    expect(pdf.decodedQrPayloads).toHaveLength(1)
    const [ticketCode] = pdf.decodedQrPayloads
    if (!ticketCode || !/^TKT-[0-9A-F]{20}$/u.test(ticketCode)) {
      throw new Error("The rendered ticket PDF did not contain a valid issued-ticket QR code")
    }

    stage = "ticket-access"
    const cleanContext = await browser.newContext()
    try {
      const capabilityPage = await cleanContext.newPage()
      await capabilityPage.goto(email.link.toString())
      await expect(
        capabilityPage.getByRole("heading", { name: "Vielen Dank – dein Kauf war erfolgreich!", level: 1 }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(capabilityPage.getByText(participantName)).toBeVisible()
      await expect(capabilityPage.getByText("Bezahlt", { exact: true }).first()).toBeVisible({ timeout: 30_000 })
    } finally {
      await cleanContext.close()
    }

    stage = "organizer-check-in"
    await ticketE2eAdminSignIn(page, environment.baseUrl)
    await page.goto(`${environment.baseUrl}/organizer/event/${encodeURIComponent(eventKey)}`)
    await expect(page.getByRole("heading", { name: eventTitle })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("form", { name: "Ticket-Code manuell prüfen" })).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 30_000 },
    )
    await expect(page.getByText("Eingecheckt", { exact: true })).toHaveCount(0)
    await page.locator("#organizer-ticket-code").fill(ticketCode)
    await page.getByRole("button", { name: "Ticket-Code prüfen" }).click()
    await expect(page.getByRole("status").getByText(/eingecheckt/i)).toBeVisible({ timeout: 30_000 })
    await page.locator("#organizer-ticket-search").fill(participantName)
    const ticketRow = page.getByRole("button", { name: new RegExp(participantName) })
    await expect(ticketRow).toBeVisible({ timeout: 30_000 })
    await expect(ticketRow.getByText("Eingecheckt", { exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("form", { name: "Ticket-Code manuell prüfen" })).toHaveAttribute(
      "data-hydrated",
      "true",
      {
        timeout: 30_000,
      },
    )
    await page.locator("#organizer-ticket-search").fill(participantName)
    await expect(ticketRow).toBeVisible({ timeout: 30_000 })
    await expect(ticketRow.getByText("Eingecheckt", { exact: true })).toBeVisible()

    await page.locator("#organizer-ticket-code").fill(ticketCode)
    await page.getByRole("button", { name: "Ticket-Code prüfen" }).click()
    await expect(page.getByText("Dieses Ticket wurde bereits eingecheckt.").first()).toBeVisible({ timeout: 30_000 })
  } catch (error) {
    await ticketE2eFailureScreenshot(
      stage === "checkout-creation" ? checkoutPage : page,
      environment.baseUrl,
      stage,
      runToken,
    )
    if (stage.startsWith("stripe-")) {
      try {
        console.error(
          `Ticket workflow failed during ${stage}; Stripe diagnostics:`,
          await ticketE2eStripeDiagnostics(checkoutPage),
        )
        if (
          checkoutPage.url().startsWith("https://checkout.stripe.com/") &&
          /\bcs_test_[A-Za-z0-9]+/u.test(checkoutPage.url())
        ) {
          const screenshotPath = `data/e2e/${stage}-failure-${runToken}.png`
          await mkdir("data/e2e", { recursive: true })
          await checkoutPage.screenshot({
            path: screenshotPath,
            fullPage: true,
            mask: [checkoutPage.locator("input"), checkoutPage.getByText(mail.user, { exact: true })],
          })
          console.error(`Stripe failure screenshot: ${screenshotPath}`)
        }
      } catch {
        console.error(`Ticket workflow failed during ${stage}; Stripe diagnostics were unavailable`)
      }
    }
    if (error instanceof Error) {
      // Keep the original locator stack (including its failing line), removing only session/token secrets.
      error.message = ticketE2eErrorSanitize(error.message)
      if (error.stack) error.stack = ticketE2eErrorSanitize(error.stack)
      throw error
    }
    throw new Error(`Ticket workflow failed during ${stage}: ${ticketE2eErrorSanitize(String(error))}`, {
      cause: error,
    })
  }
})

async function ticketE2eStripeDiagnostics(page: Page): Promise<string> {
  const currentUrl = new URL(page.url())
  const safeUrl = `${currentUrl.origin}${ticketE2eUrlPathSanitize(currentUrl.pathname)}`
  const inputNames = await page.locator("input").evaluateAll((inputs) =>
    inputs
      .filter((input) => input.getClientRects().length > 0)
      .map((input) =>
        [
          input.getAttribute("name"),
          input.getAttribute("aria-label"),
          input.getAttribute("autocomplete"),
          input.getAttribute("placeholder"),
        ]
          .filter(Boolean)
          .join(" | "),
      )
      .filter(Boolean),
  )
  const buttons = await page.locator("button").evaluateAll((elements) =>
    elements
      .filter(
        (button): button is HTMLButtonElement =>
          button instanceof HTMLButtonElement && button.getClientRects().length > 0,
      )
      .map((button) => button.getAttribute("aria-label") || button.innerText.trim())
      .filter(Boolean),
  )
  const frames = page.frames().map((frame) => ({ origin: new URL(frame.url()).origin, name: frame.name() }))
  return JSON.stringify({ url: safeUrl, visibleInputs: inputNames, buttons, frames })
}

function ticketE2eErrorSanitize(value: string): string {
  return value
    .replace(/https?:\/\/[^\s"'<>]+/gu, (candidate) => {
      try {
        const url = new URL(candidate)
        return `${url.origin}${ticketE2eUrlPathSanitize(url.pathname)}`
      } catch {
        return "[redacted-url]"
      }
    })
    .replace(/\bcs_(?:test|live)_[A-Za-z0-9_-]+/gu, "[redacted-session]")
    .replace(/\b(?:client_secret|token|secret)=([^&\s]+)/giu, "$1=[redacted]")
}

function ticketE2eUrlPathSanitize(pathname: string): string {
  return pathname.replace(/\bcs_(?:test|live)_[A-Za-z0-9_-]+/gu, "[redacted-session]")
}

async function ticketE2eFailureScreenshot(page: Page, baseUrl: string, stage: string, runToken: string): Promise<void> {
  try {
    const currentUrl = new URL(page.url())
    const baseOrigin = new URL(baseUrl).origin
    const safePath = ["/admin/", "/events/", "/warenkorb", "/checkout", "/organizer/"].some((prefix) =>
      currentUrl.pathname.startsWith(prefix),
    )
    if (currentUrl.origin !== baseOrigin || !safePath) return

    const screenshotPath = `data/e2e/${stage}-failure-${runToken}.png`
    await mkdir("data/e2e", { recursive: true })
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      mask: [
        page.locator("input"),
        page.locator("textarea"),
        page.locator('[role="status"]'),
        page.locator('[role="alert"]'),
        page.locator(".font-mono"),
      ],
    })
    console.error(`Ticket workflow failure screenshot: ${screenshotPath}`)
  } catch {
    // A failed screenshot must not replace the original workflow error.
  }
}

function ticketE2eMailboxRead(mailcow: Record<string, string | undefined>): {
  host: string
  port: number
  user: string
  password: string
} {
  const host = mailcow.TEST_CUSTOMER_MAILCOW_HOST?.trim()
  const rawPort = mailcow.TEST_CUSTOMER_MAILCOW_IMAP_PORT?.trim()
  const user = mailcow.TEST_CUSTOMER_MAILCOW_USER?.trim()
  const password = mailcow.TEST_CUSTOMER_MAILCOW_PASS
  const port = Number(rawPort || "993")
  const missing = [
    !host && "TEST_CUSTOMER_MAILCOW_HOST",
    !user && "TEST_CUSTOMER_MAILCOW_USER",
    !password && "TEST_CUSTOMER_MAILCOW_PASS",
    (!Number.isInteger(port) || port < 1 || port > 65535) && "TEST_CUSTOMER_MAILCOW_IMAP_PORT",
  ].filter(Boolean)
  if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Missing or invalid IMAP test mailbox settings: ${missing.join(", ")}`)
  }
  return { host, port, user, password }
}

function ticketE2eLocalDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}
