import { expect, type Page } from "@rstest/playwright"
import { e2eAuthCredentialsGet } from "../config/e2eAuthCredentialsGet.ts"

export async function eventorenE2eSignIn(page: Page, baseUrl: string, path: string): Promise<void> {
  const credentials = e2eAuthCredentialsGet(process.env)
  if (!credentials.success) throw new Error(credentials.errorMessage)

  const baseOrigin = new URL(baseUrl).origin
  const destination = `${baseUrl}${path}`
  if (page.url() !== destination) await page.goto(destination)
  const signIn = page.getByRole("link", { name: /continue with zitadel/i })
  if (new URL(page.url()).origin === baseOrigin && (await signIn.isVisible().catch(() => false))) {
    // The provider can start loading during click; arm the navigation wait first.
    await Promise.all([page.waitForURL((url) => url.origin !== baseOrigin, { timeout: 60_000 }), signIn.click()])
  }

  // An already-authenticated session may remain on the application; the SSO test
  // independently requires a callback so this cannot make that workflow pass.
  if (new URL(page.url()).origin === baseOrigin) return

  const username = page.getByRole("textbox", { name: /loginname|username|email/i })
  await expect(username).toBeVisible({ timeout: 60_000 })
  await username.fill(credentials.data.username)
  await page.getByRole("button", { name: /next|continue|weiter/i }).click()

  const password = page.getByRole("textbox", { name: /password|passwort/i })
  await expect(password).toBeVisible({ timeout: 60_000 })
  await password.fill(credentials.data.password)
  await page.getByRole("button", { name: /next|continue|sign in|log in|weiter|anmelden/i }).click()
  await page.waitForURL((url) => url.origin === baseOrigin, { timeout: 60_000 })
}
