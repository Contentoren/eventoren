import type { Page } from "@rstest/playwright"
import { e2eAuthCredentialsGet } from "../config/e2eAuthCredentialsGet.ts"
import { eventorenE2eReturnUrlMatches } from "./eventorenE2eReturnUrlMatches.ts"

export async function eventorenE2eSignIn(page: Page, baseUrl: string, path: string): Promise<void> {
  const credentials = e2eAuthCredentialsGet(process.env)
  if (!credentials.success) throw new Error(credentials.errorMessage)

  const baseOrigin = new URL(baseUrl).origin
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error(`Unsafe E2E sign-in return path: ${path}`)
  }
  const returnTarget = new URL(path, baseOrigin)
  if (
    returnTarget.origin !== baseOrigin ||
    returnTarget.pathname === "/sso" ||
    returnTarget.pathname.startsWith("/sso/")
  ) {
    throw new Error(`Unsafe E2E sign-in return path: ${path}`)
  }
  if (returnTarget.pathname === "/admin") returnTarget.pathname = "/admin/bestellungen"
  const safeReturnTo = `${returnTarget.pathname}${returnTarget.search}${returnTarget.hash}`
  const destination = `${baseOrigin}/sso?returnTo=${encodeURIComponent(safeReturnTo)}`
  await page.goto(destination)

  if (new URL(page.url()).origin === baseOrigin) {
    const signIn = page.getByRole("link", { name: /continue with zitadel/i })
    await signIn.waitFor({ state: "visible", timeout: 60_000 })
    // Arm the navigation wait before the click; the SSO link immediately starts the provider redirect.
    await Promise.all([page.waitForURL((url) => url.origin !== baseOrigin, { timeout: 60_000 }), signIn.click()])
  }

  if (new URL(page.url()).origin !== baseOrigin) {
    const username = page.getByRole("textbox", { name: /loginname|username|email/i })
    await username.waitFor({ state: "visible", timeout: 60_000 })
    await username.fill(credentials.data.username)
    await page.getByRole("button", { name: /next|continue|weiter/i }).click()

    const password = page.getByRole("textbox", { name: /password|passwort/i })
    await password.waitFor({ state: "visible", timeout: 60_000 })
    await password.fill(credentials.data.password)
    await page.getByRole("button", { name: /next|continue|sign in|log in|weiter|anmelden/i }).click()
    await page.waitForURL((url) => eventorenE2eReturnUrlMatches(baseOrigin, returnTarget, url), { timeout: 60_000 })
  }

  await page.waitForFunction(
    async () => {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      const body = await response.json()
      return (
        response.status === 200 && Boolean(body.session) && response.headers.get("cache-control")?.includes("no-store")
      )
    },
    undefined,
    { timeout: 60_000 },
  )
}
