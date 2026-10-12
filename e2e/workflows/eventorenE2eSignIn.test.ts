import { describe, expect, it } from "@rstest/core"
import type { Page } from "@rstest/playwright"
import { eventorenE2eSignIn } from "./eventorenE2eSignIn.ts"

type ProbeState = "valid" | "anonymous" | "expired" | "malformed" | "error"

function eventorenE2eSignInPageMockCreate(input: {
  startUrl: string
  probe?: ProbeState | { throws: true }
  probeStatus?: number
  loginLandingUrl?: string
}) {
  const navigations: string[] = []
  const roleQueries: Array<{ role: string; name: RegExp | string }> = []
  const evaluateSources: string[] = []
  const waitFunctionSources: string[] = []
  let evaluateCalls = 0
  let sessionProofs = 0
  let linkClicks = 0
  let currentUrl = input.startUrl
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
    evaluate: async (fn: (...args: never[]) => unknown) => {
      evaluateCalls += 1
      evaluateSources.push(String(fn))
      if (input.probe && typeof input.probe === "object" && "throws" in input.probe) throw new Error("fetch failed")
      const state = (typeof input.probe === "string" ? input.probe : "anonymous") as ProbeState
      const status = input.probeStatus ?? (state === "error" ? 503 : 200)
      return { status, cacheControl: status === 200 ? "no-store" : null, state }
    },
    getByRole: (role: string, options: { name: RegExp }) => {
      roleQueries.push({ role, name: options.name })
      return {
        waitFor: async () => {},
        click: async () => {
          if (role === "link") {
            linkClicks += 1
            currentUrl = "https://idp.eventoren.de/login"
          } else if (++buttonClicks === 2)
            currentUrl = input.loginLandingUrl ?? "https://eventoren.de/admin/events?view=upcoming#list"
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
    waitForFunction: async (fn: (...args: never[]) => unknown) => {
      sessionProofs += 1
      waitFunctionSources.push(String(fn))
    },
  } as unknown as Page
  return {
    page,
    navigations,
    roleQueries,
    evaluateSources,
    waitFunctionSources,
    getState: () => ({ evaluateCalls, sessionProofs, linkClicks }),
  }
}

function eventorenE2eSignInCredentialsGuard(run: () => Promise<void>): () => Promise<void> {
  return async () => {
    const previousUsername = process.env.E2E_AUTH_USERNAME
    const previousPassword = process.env.E2E_AUTH_PASSWORD
    const previousRunId = process.env.E2E_RUN_ID
    process.env.E2E_AUTH_USERNAME = "e2e-user"
    process.env.E2E_AUTH_PASSWORD = "e2e-password"
    delete process.env.E2E_RUN_ID
    try {
      await run()
    } finally {
      if (previousUsername === undefined) delete process.env.E2E_AUTH_USERNAME
      else process.env.E2E_AUTH_USERNAME = previousUsername
      if (previousPassword === undefined) delete process.env.E2E_AUTH_PASSWORD
      else process.env.E2E_AUTH_PASSWORD = previousPassword
      if (previousRunId === undefined) delete process.env.E2E_RUN_ID
      else process.env.E2E_RUN_ID = previousRunId
    }
  }
}

describe("Eventoren E2E sign-in helper", () => {
  it(
    "reuses a valid existing session without any SSO click",
    eventorenE2eSignInCredentialsGuard(async () => {
      const mock = eventorenE2eSignInPageMockCreate({
        startUrl: "https://eventoren.de/admin/events?view=upcoming",
        probe: "valid",
      })

      await eventorenE2eSignIn(mock.page, "https://eventoren.de", "/admin/events?view=upcoming#list")

      expect(mock.navigations).toHaveLength(1)
      const reusedUrl = new URL(mock.navigations[0] ?? "")
      expect(reusedUrl.pathname).toBe("/admin/events")
      expect(reusedUrl.search).toBe("?view=upcoming")
      expect(reusedUrl.hash).toBe("#list")
      expect(mock.getState().linkClicks).toBe(0)
      expect(mock.roleQueries.some(({ role }) => role === "link")).toBe(false)
      expect(mock.roleQueries.some(({ role }) => role === "textbox")).toBe(false)
      expect(mock.getState().evaluateCalls).toBe(1)
      expect(mock.getState().sessionProofs).toBe(1)
      expect(mock.evaluateSources.some((source) => source.includes("no-store"))).toBe(true)
      expect(mock.evaluateSources.some((source) => source.includes("cache-control"))).toBe(true)
      expect(mock.waitFunctionSources.some((source) => source.includes("no-store"))).toBe(true)
    }),
  )

  it(
    "clicks the SSO link, completes the IdP flow, and waits for a no-store session",
    eventorenE2eSignInCredentialsGuard(async () => {
      const mock = eventorenE2eSignInPageMockCreate({
        startUrl: "https://eventoren.de/admin/events?view=upcoming",
        probe: "anonymous",
      })

      await eventorenE2eSignIn(mock.page, "https://eventoren.de", "/admin/events?view=upcoming#list")

      expect(mock.navigations).toHaveLength(1)
      const signInUrl = new URL(mock.navigations[0] ?? "")
      expect(signInUrl.pathname).toBe("/sso")
      expect(signInUrl.searchParams.get("returnTo")).toBe("/admin/events?view=upcoming#list")
      expect(
        mock.roleQueries.some(({ role, name }) => role === "link" && (name as RegExp).test("Continue with Zitadel")),
      ).toBe(true)
      expect(mock.roleQueries.some(({ role, name }) => role === "textbox" && (name as RegExp).test("Loginname"))).toBe(
        true,
      )
      expect(mock.roleQueries.some(({ role, name }) => role === "textbox" && (name as RegExp).test("Password"))).toBe(
        true,
      )
      expect(mock.getState().sessionProofs).toBe(1)
      expect(mock.evaluateSources.some((source) => source.includes("no-store"))).toBe(true)
      expect(mock.waitFunctionSources.some((source) => source.includes("no-store"))).toBe(true)
    }),
  )

  it(
    "starts a fresh SSO flow from a fresh context without reusing a session",
    eventorenE2eSignInCredentialsGuard(async () => {
      const mock = eventorenE2eSignInPageMockCreate({
        startUrl: "about:blank",
        probe: "anonymous",
        loginLandingUrl: "https://eventoren.de/admin/events",
      })

      await eventorenE2eSignIn(mock.page, "https://eventoren.de", "/admin/events")

      expect(mock.navigations).toHaveLength(1)
      expect(new URL(mock.navigations[0] ?? "").pathname).toBe("/sso")
      expect(mock.getState().evaluateCalls).toBe(0)
      expect(mock.getState().sessionProofs).toBe(1)
    }),
  )

  it(
    "retains fixtures on an expired session instead of assuming anonymous",
    eventorenE2eSignInCredentialsGuard(async () => {
      const mock = eventorenE2eSignInPageMockCreate({
        startUrl: "https://eventoren.de/admin/events",
        probe: "expired",
      })

      await expect(eventorenE2eSignIn(mock.page, "https://eventoren.de", "/admin/events")).rejects.toThrow(
        /expired|fixtures retained/u,
      )
      expect(mock.navigations).toHaveLength(0)
      expect(mock.getState().linkClicks).toBe(0)
    }),
  )

  it(
    "retains fixtures on a malformed session instead of clearing the cookie",
    eventorenE2eSignInCredentialsGuard(async () => {
      const mock = eventorenE2eSignInPageMockCreate({
        startUrl: "https://eventoren.de/admin/events",
        probe: "malformed",
      })

      await expect(eventorenE2eSignIn(mock.page, "https://eventoren.de", "/admin/events")).rejects.toThrow(
        /malformed|fixtures retained/u,
      )
      expect(mock.navigations).toHaveLength(0)
    }),
  )

  it(
    "retains fixtures on a session probe error instead of assuming anonymous",
    eventorenE2eSignInCredentialsGuard(async () => {
      const mock = eventorenE2eSignInPageMockCreate({
        startUrl: "https://eventoren.de/admin/events",
        probe: "error",
        probeStatus: 503,
      })

      await expect(eventorenE2eSignIn(mock.page, "https://eventoren.de", "/admin/events")).rejects.toThrow(
        /fixtures retained/u,
      )
      expect(mock.navigations).toHaveLength(0)
    }),
  )

  it(
    "fails on a foreign origin instead of reusing or clearing the session",
    eventorenE2eSignInCredentialsGuard(async () => {
      const mock = eventorenE2eSignInPageMockCreate({
        startUrl: "https://idp.eventoren.de/login",
        probe: "valid",
      })

      await expect(eventorenE2eSignIn(mock.page, "https://eventoren.de", "/admin/events")).rejects.toThrow(
        /foreign origin/u,
      )
      expect(mock.navigations).toHaveLength(0)
      expect(mock.getState().evaluateCalls).toBe(0)
    }),
  )
})
