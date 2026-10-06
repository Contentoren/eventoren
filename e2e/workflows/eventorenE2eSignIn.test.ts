import { describe, expect, it } from "@rstest/core"
import type { Page } from "@rstest/playwright"
import { eventorenE2eSignIn } from "./eventorenE2eSignIn.ts"

describe("Eventoren E2E sign-in helper", () => {
  it("clicks the SSO link, completes the IdP flow, and waits for a no-store session", async () => {
    const previousUsername = process.env.E2E_AUTH_USERNAME
    const previousPassword = process.env.E2E_AUTH_PASSWORD
    process.env.E2E_AUTH_USERNAME = "e2e-user"
    process.env.E2E_AUTH_PASSWORD = "e2e-password"
    const navigations: string[] = []
    const roleQueries: Array<{ role: string; name: RegExp }> = []
    let sessionChecked = false
    let currentUrl = "https://eventoren.de/admin/events?view=upcoming"
    let buttonClicks = 0
    let navigationWait: { predicate: (url: URL) => boolean; resolve: () => void } | undefined
    const urlChanged = () => {
      if (navigationWait && navigationWait.predicate(new URL(currentUrl))) {
        navigationWait.resolve()
        navigationWait = undefined
      }
    }
    const page = {
      url: () => currentUrl,
      goto: async (url: string) => {
        navigations.push(url)
        currentUrl = url
      },
      getByRole: (role: string, options: { name: RegExp }) => {
        roleQueries.push({ role, name: options.name })
        return {
          waitFor: async () => {},
          click: async () => {
            if (role === "link") currentUrl = "https://idp.eventoren.de/login"
            else if (++buttonClicks === 2) currentUrl = "https://eventoren.de/admin/events?view=upcoming#list"
            urlChanged()
          },
          fill: async () => {},
        }
      },
      waitForURL: (predicate: (url: URL) => boolean) => {
        if (predicate(new URL(currentUrl))) return Promise.resolve()
        return new Promise<void>((resolve) => {
          navigationWait = { predicate, resolve }
        })
      },
      waitForFunction: async () => {
        sessionChecked = true
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
    expect(roleQueries.some(({ role, name }) => role === "link" && name.test("Continue with Zitadel"))).toBe(true)
    expect(roleQueries.some(({ role, name }) => role === "textbox" && name.test("Loginname"))).toBe(true)
    expect(roleQueries.some(({ role, name }) => role === "textbox" && name.test("Password"))).toBe(true)
    expect(sessionChecked).toBe(true)
  })
})
