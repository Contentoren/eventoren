import { describe, expect, it } from "@rstest/core"
import type { Page } from "@rstest/playwright"
import { eventorenE2eSignIn } from "./eventorenE2eSignIn.ts"

describe("Eventoren E2E sign-in helper", () => {
  it("enters the supported SSO route and waits for a no-store authenticated session", async () => {
    const previousUsername = process.env.E2E_AUTH_USERNAME
    const previousPassword = process.env.E2E_AUTH_PASSWORD
    process.env.E2E_AUTH_USERNAME = "e2e-user"
    process.env.E2E_AUTH_PASSWORD = "e2e-password"
    const navigations: string[] = []
    let sessionChecked = false
    const page = {
      url: () => "https://eventoren.de/admin/events?view=upcoming",
      goto: async (url: string) => {
        navigations.push(url)
      },
      getByRole: () => ({ isVisible: async () => false }),
      evaluate: async () => {
        sessionChecked = true
        return true
      },
    } as unknown as Page

    try {
      await eventorenE2eSignIn(page, "https://eventoren.de", "/admin/events?view=upcoming#list")
    } finally {
      if (previousUsername === undefined) delete process.env.E2E_AUTH_USERNAME
      else process.env.E2E_AUTH_USERNAME = previousUsername
      if (previousPassword === undefined) delete process.env.E2E_AUTH_PASSWORD
      else process.env.E2E_AUTH_PASSWORD = previousPassword
    }

    expect(navigations).toHaveLength(1)
    const signInUrl = new URL(navigations[0] ?? "")
    expect(signInUrl.pathname).toBe("/sso")
    expect(signInUrl.searchParams.get("returnTo")).toBe("/admin/events?view=upcoming#list")
    expect(sessionChecked).toBe(true)
  })
})
