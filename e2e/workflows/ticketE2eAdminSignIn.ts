import { expect, type Page } from "@rstest/playwright"
import { eventorenE2eSignIn } from "./eventorenE2eSignIn.ts"

export async function ticketE2eAdminSignIn(page: Page, baseUrl: string): Promise<void> {
  await eventorenE2eSignIn(page, baseUrl, "/admin/events")
  // The admin loader returns unauthenticated users to /admin, whose index redirects
  // to /admin/bestellungen. Wait for that SSO redirect to finish before navigating.
  const origin = new URL(baseUrl).origin
  await page.waitForURL(
    (url) => url.origin === origin && (url.pathname === "/admin/bestellungen" || url.pathname === "/admin/events"),
    { timeout: 60_000 },
  )
  const navigation = page.getByRole("navigation", { name: "Admin-Navigation" })
  await expect(navigation.getByRole("link", { name: "Events", exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('summary[aria-label="Benutzermenü"]')).toBeVisible()
  await expect(page.locator("main#content h1")).toHaveText(
    new URL(page.url()).pathname === "/admin/bestellungen" ? "Bestellungen" : "Events",
  )
  await navigation.getByRole("link", { name: "Events", exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/events(?:\?|$)/u, { timeout: 60_000 })
  await expect(page.getByRole("heading", { name: /events/i })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("link", { name: /event erstellen|neues event/i })).toBeVisible()
}
