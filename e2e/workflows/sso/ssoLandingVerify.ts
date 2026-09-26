import { expect, type Page, type Response } from "@rstest/playwright"

export async function ssoLandingVerify(page: Page, baseUrl: string): Promise<Response[]> {
  const callbacks: Response[] = []
  const origin = new URL(baseUrl).origin
  // Install before /sso: automatic sign-in can start during page load.
  page.on("response", (response) => {
    const url = new URL(response.url())
    if (
      url.origin === origin &&
      url.pathname === "/login/zitadel/callback" &&
      response.request().method() === "GET" &&
      response.request().isNavigationRequest()
    )
      callbacks.push(response)
  })

  await page.goto(`${baseUrl}/sso`)
  await expect(page.getByRole("heading", { name: "Single Sign-On" })).toBeVisible()
  await expect(page.getByRole("link", { name: /continue with zitadel/i })).toBeVisible()
  return callbacks
}
