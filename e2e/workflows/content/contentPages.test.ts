import { expect } from "@rstest/playwright"
import type { Page } from "playwright"
import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"

// Public Ratgeber/Guides pages. Navigation uses paths only; the host comes from the
// Playwright baseURL set by e2e/content-rstest.config.ts (resolved E2E target origin).
// Canonical/hreflang URLs always point at the production site, whichever host serves the page.
const siteOrigin = "https://eventoren.de"
const articlePathDe = "/ratgeber/tickets-online-verkaufen"
const articlePathEn = "/en/guides/sell-tickets-online"
const hubHeadingDe = "Ratgeber für Veranstalter 2026/27: Tickets verkaufen, Einlass meistern, rechtssicher planen"
const desktopViewport = { width: 1280, height: 900 }
const mobileViewport = { width: 390, height: 844 }

async function articleOpen(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "load" })
  expect(response?.status()).toBe(200)
  await expect(page.getByText("Etwas ist schiefgelaufen")).toHaveCount(0)
  await expect(page.locator("h1")).toHaveCount(1)
}

test("homepage header link 'Ratgeber' opens the hub client-side with all article cards", async ({ page }) => {
  await page.setViewportSize(desktopViewport)
  // Wait until the router has hydrated; an earlier click would trigger a native document load.
  await page.goto("/", { waitUntil: "networkidle" })
  await page.evaluate(() => {
    ;(window as unknown as { e2eSameDocument: boolean }).e2eSameDocument = true
  })

  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Ratgeber" }).click()

  await expect(page).toHaveURL(/\/ratgeber$/)
  await expect(page.getByRole("heading", { level: 1, name: hubHeadingDe })).toBeVisible()
  // The marker survives only when the router navigated without a full document load.
  expect(await page.evaluate(() => (window as unknown as { e2eSameDocument?: boolean }).e2eSameDocument)).toBe(true)
  expect(await page.locator("main article").count()).toBeGreaterThanOrEqual(60)
})

test("German article loads directly with hero, contents, key facts, FAQ and contact CTA", async ({ page }) => {
  await page.setViewportSize(desktopViewport)
  await articleOpen(page, articlePathDe)

  const hero = page.locator('main img[fetchpriority="high"]')
  await expect(hero).toHaveCount(1)
  await expect
    .poll(() => hero.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth))
    .toBeGreaterThan(0)

  await expect(page.locator("main article blockquote", { hasText: "Das Wichtigste in Kürze" })).toBeVisible()
  await expect(page.locator("main article h2", { hasText: "Häufige Fragen" })).toBeVisible()
  await expect(page.locator('main a[href="/kontakt"]').first()).toBeVisible()

  const tocLinks = page.getByRole("navigation", { name: "Inhalt" }).filter({ visible: true }).getByRole("link")
  const tocHrefs = await tocLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
  expect(tocHrefs.length).toBeGreaterThan(0)
  for (const href of tocHrefs) {
    expect(href.startsWith("#")).toBe(true)
    await expect(page.locator(`[id="${href.slice(1)}"]`)).toHaveCount(1)
  }

  const lastHref = tocHrefs[tocHrefs.length - 1] ?? ""
  await tocLinks.last().click()
  await expect(page.locator(`[id="${lastHref.slice(1)}"]`)).toBeInViewport()
})

test("German article 'Read in English' link opens the paired English guide in English", async ({ page }) => {
  await articleOpen(page, articlePathDe)

  const switchLink = page.getByRole("link", { name: /Read in English/ })
  await expect(switchLink).toHaveAttribute("href", articlePathEn)
  await switchLink.click()

  await expect(page).toHaveURL(new RegExp(`${articlePathEn}$`))
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(page.locator("h1")).toHaveCount(1)
  await expect(page.getByRole("link", { name: /Auf Deutsch lesen/ })).toHaveAttribute("href", articlePathDe)
})

test("direct article load logs no hydration errors in the browser console", async ({ page }) => {
  const hydrationMessages: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Hydration")) hydrationMessages.push(message.text())
  })

  await articleOpen(page, articlePathDe)
  // Hydration runs after load; let the client settle before reading collected messages.
  await page.waitForLoadState("networkidle")

  expect(hydrationMessages).toEqual([])
})

test("English guides hub lists at least 20 guide cards", async ({ page }) => {
  const response = await page.goto("/en/guides", { waitUntil: "load" })
  expect(response?.status()).toBe(200)
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(page.locator("h1")).toHaveCount(1)
  expect(await page.locator("main article").count()).toBeGreaterThanOrEqual(20)
})

test("mobile article contents disclosure opens on tap", async ({ page }) => {
  await page.setViewportSize(mobileViewport)
  await articleOpen(page, articlePathDe)

  const disclosure = page.locator("main details", { has: page.locator("summary", { hasText: "Inhalt" }) })
  await expect(disclosure).not.toHaveAttribute("open", "")
  await disclosure.locator("summary").click()

  await expect(disclosure).toHaveAttribute("open", "")
  await expect(disclosure.getByRole("link").first()).toBeVisible()
})

test("German article head exposes canonical URL, English hreflang and FAQPage structured data", async ({ page }) => {
  await articleOpen(page, articlePathDe)

  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${siteOrigin}${articlePathDe}`)
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
    "href",
    `${siteOrigin}${articlePathEn}`,
  )
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((script) => script.textContent ?? "").join("\n"))
  expect(jsonLd).toContain('"FAQPage"')
})

test("unknown Ratgeber slug responds with HTTP 404", async ({ request }) => {
  const response = await request.get("/ratgeber/does-not-exist", { maxRedirects: 0 })
  expect(response.status()).toBe(404)
})
