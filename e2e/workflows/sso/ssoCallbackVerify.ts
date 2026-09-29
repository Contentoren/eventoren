import { expect, type Page, type Response } from "@rstest/playwright"
import { eventorenE2eSignIn } from "../eventorenE2eSignIn.ts"

export async function ssoCallbackVerify(page: Page, baseUrl: string, callbacks: Response[]): Promise<void> {
  await eventorenE2eSignIn(page, baseUrl, "/admin")
  await expect.poll(() => callbacks.length, { timeout: 60_000 }).toBe(1)
  const callback = callbacks[0]
  if (!callback) throw new Error("No Eventoren OIDC callback response was observed")
  const callbackUrl = new URL(callback.url())
  expect(callbackUrl.searchParams.get("error"), "Zitadel reported an OIDC callback error").toBeNull()
  expect(callbackUrl.searchParams.get("error_description"), "Zitadel reported an OIDC callback error").toBeNull()
  const callbackBody = callback.status() === 302 ? "" : await callback.text()
  expect(callback.status(), `Eventoren callback failed: ${callbackBody}`).toBe(302)
  const destination = new URL(callback.headers().location ?? "/missing-callback-location", baseUrl)
  expect(destination.origin).toBe(new URL(baseUrl).origin)
  expect(destination.pathname).toBe("/sign-in")
  expect(destination.searchParams.get("returnTo")).toBe("/admin")
  await expect(page).toHaveURL(new URL("/admin/bestellungen", baseUrl).toString(), { timeout: 60_000 })
  await expect(
    page.getByText(
      /Die Eventoren-Anmeldung konnte nicht (?:verifiziert|abgeschlossen) werden|Die Eventoren-(?:Benutzerinformationen konnten nicht geladen|Sitzung konnte nicht erstellt) werden/u,
    ),
  ).not.toBeVisible()
  const navigation = page.getByRole("navigation", { name: "Admin-Navigation" })
  await expect(navigation.getByRole("link", { name: "Events", exact: true })).toBeVisible({ timeout: 30_000 })
}
