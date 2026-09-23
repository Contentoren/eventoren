import { expect, test } from "@rstest/playwright"
import { e2eEnvironmentRead } from "../config/e2eEnvironmentRead.ts"
import { eventorenE2eSignIn } from "./eventorenE2eSignIn.ts"

const environmentResult = e2eEnvironmentRead(process.env)
if (!environmentResult.success) throw new Error(environmentResult.errorMessage)
const environment = environmentResult.data

test("testadmin signs in through Eventoren SSO and reaches the authenticated application", {
  timeout: 180_000,
}, async ({ page }) => {
  const callbackResponses: import("@rstest/playwright").Response[] = []
  const baseOrigin = new URL(environment.baseUrl).origin
  // Install before either /sso visit: automatic sign-in can start during page load.
  page.on("response", (response) => {
    const url = new URL(response.url())
    if (
      url.origin === baseOrigin &&
      url.pathname === "/login/zitadel/callback" &&
      response.request().method() === "GET" &&
      response.request().isNavigationRequest()
    )
      callbackResponses.push(response)
  })

  await page.goto(`${environment.baseUrl}/sso`)
  await expect(page.getByRole("heading", { name: "Single Sign-On" })).toBeVisible()
  await expect(page.getByRole("link", { name: /continue with zitadel/i })).toBeVisible()

  await eventorenE2eSignIn(page, environment.baseUrl, "/sso")
  await expect.poll(() => callbackResponses.length, { timeout: 60_000 }).toBe(1)
  const callback = callbackResponses[0]
  if (!callback) throw new Error("No Eventoren OIDC callback response was observed")
  const callbackUrl = new URL(callback.url())
  // Eventoren returns plain-text 400/403/502 on callback failure, not an error UI redirect.
  // Zitadel may also send an error query parameter to the callback instead of a code.
  expect(callbackUrl.searchParams.get("error"), "Zitadel reported an OIDC callback error").toBeNull()
  expect(callbackUrl.searchParams.get("error_description"), "Zitadel reported an OIDC callback error").toBeNull()
  const callbackBody = callback.status() === 302 ? "" : await callback.text()
  expect(callback.status(), `Eventoren callback failed: ${callbackBody}`).toBe(302)
  const destination = new URL(callback.headers().location ?? "/missing-callback-location", environment.baseUrl)
  expect(destination.origin).toBe(baseOrigin)
  expect(destination.pathname).toBe("/sign-in")
  expect(destination.searchParams.get("returnTo")).toBe("/")
  // The callback sets the session cookie and returns through /sign-in and /sso.
  // Wait for that flow to finish before checking the session; a fresh goto would hide a failed callback.
  await expect(page).toHaveURL(new URL("/", environment.baseUrl).toString(), { timeout: 60_000 })
  await expect(
    page.getByText(
      /Die Eventoren-Anmeldung konnte nicht (?:verifiziert|abgeschlossen) werden|Die Eventoren-(?:Benutzerinformationen konnten nicht geladen|Sitzung konnte nicht erstellt) werden/u,
    ),
  ).not.toBeVisible()
  await expect(page.getByRole("link", { name: "Veranstalter", exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("link", { name: "Verwaltung", exact: true })).toBeVisible()
})
