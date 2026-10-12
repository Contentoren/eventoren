import type { Page } from "@rstest/playwright"
import { e2eAuthSessionMark } from "../auth/e2eAuthSessionMark.ts"
import { e2eAuthSessionRunResolve } from "../auth/e2eAuthSessionRunResolve.ts"
import { e2eAuthCredentialsGet } from "../config/e2eAuthCredentialsGet.ts"
import { eventorenE2eReturnUrlMatches } from "./eventorenE2eReturnUrlMatches.ts"

type EventorenE2eSessionProbe = {
  readonly status: number
  readonly cacheControl: string | null
  readonly state: "valid" | "anonymous" | "expired" | "malformed" | "error"
}

export async function eventorenE2eSignIn(page: Page, baseUrl: string, path: string): Promise<void> {
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

  // Reuse an already-valid same-origin admin session instead of starting a
  // second SSO login. The DEV ticket run completes the event step (valid
  // session) and then repeats sign-in for the product step: navigating to
  // /sso while authenticated auto-redirects, so the SSO link click is
  // intercepted. Probe the existing session first; only anonymous sessions
  // start the fresh SSO flow below.
  const reuse = await eventorenE2eSessionProbeRead(page, baseOrigin)
  if (reuse === "reused") {
    await page.goto(returnTarget.toString())
    await page.waitForFunction(
      async () => {
        const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
        const body = await response.json()
        return (
          response.status === 200 &&
          Boolean(body.session) &&
          response.headers.get("cache-control")?.includes("no-store")
        )
      },
      undefined,
      { timeout: 60_000 },
    )
    return
  }

  const credentials = e2eAuthCredentialsGet(process.env)
  if (!credentials.success) throw new Error(credentials.errorMessage)

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
  await eventorenE2eSessionRegister(page)
}

/**
 * Probe the existing same-origin session without minting a new SSO login.
 * Returns "reused" for a validated token/profile/expiry, "fresh" for an
 * explicit anonymous (200 + null) session or a fresh context with no origin,
 * and throws (retaining fixtures) for expired/malformed/error/foreign-origin
 * probes. The token never leaves browser memory: validation runs inside
 * evaluate and only the state is returned.
 */
async function eventorenE2eSessionProbeRead(page: Page, baseOrigin: string): Promise<"reused" | "fresh"> {
  let currentOrigin: string | null = null
  let isFreshContext = false
  try {
    const current = new URL(page.url())
    if (current.protocol === "about:" || current.origin === "null") isFreshContext = true
    else currentOrigin = current.origin
  } catch {
    isFreshContext = true
  }
  if (currentOrigin !== null && currentOrigin !== baseOrigin) {
    throw new Error("E2E sign-in interrupted on foreign origin; reconcile manually")
  }
  if (isFreshContext || currentOrigin === null) return "fresh"

  let probed: EventorenE2eSessionProbe
  try {
    probed = await page.evaluate(async (): Promise<EventorenE2eSessionProbe> => {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      const cacheControl = response.headers.get("cache-control")
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (response.status !== 200) return { status: response.status, cacheControl, state: "error" as const }
      if (!cacheControl || !cacheControl.includes("no-store"))
        return { status: response.status, cacheControl, state: "error" as const }
      if (typeof body !== "object" || body === null || !("session" in body))
        return { status: response.status, cacheControl, state: "malformed" as const }
      const session = (body as { session: unknown }).session
      if (session === null) return { status: response.status, cacheControl, state: "anonymous" as const }
      if (typeof session !== "object" || session === null)
        return { status: response.status, cacheControl, state: "malformed" as const }
      const candidate = session as { token?: unknown; profile?: unknown; expiresAt?: unknown }
      if (typeof candidate.token !== "string" || candidate.token.length === 0)
        return { status: response.status, cacheControl, state: "malformed" as const }
      if (typeof candidate.profile !== "object" || candidate.profile === null)
        return { status: response.status, cacheControl, state: "malformed" as const }
      const profile = candidate.profile as { userId?: unknown }
      if (typeof profile.userId !== "string" || profile.userId.length === 0)
        return { status: response.status, cacheControl, state: "malformed" as const }
      if (
        typeof candidate.expiresAt !== "number" ||
        !Number.isInteger(candidate.expiresAt) ||
        candidate.expiresAt <= Date.now()
      )
        return { status: response.status, cacheControl, state: "expired" as const }
      return { status: response.status, cacheControl, state: "valid" as const }
    })
  } catch {
    throw new Error("E2E auth session could not be probed; fixtures retained")
  }
  if (!probed || probed.status !== 200 || !probed.cacheControl?.includes("no-store")) {
    throw new Error(
      `E2E auth session probe failed (${(probed as EventorenE2eSessionProbe | undefined)?.status ?? "unknown"}); fixtures retained`,
    )
  }
  if (probed.state === "anonymous") return "fresh"
  if (probed.state === "valid") return "reused"
  if (probed.state === "expired") throw new Error("E2E auth session is expired; fixtures retained")
  throw new Error("E2E auth session probe is malformed; fixtures retained")
}

/**
 * Register the exact newly created session as an E2E fixture for the actual
 * outer-runner run. Skips silently outside an E2E run (no run marker or
 * cleanup URL); a registration failure throws so the test fails and retains
 * its business fixtures. The token never leaves memory except as a digest.
 * Only fresh SSO logins register; reused sessions keep the outer-run
 * evidence unchanged and never revoke unmarked history.
 */
async function eventorenE2eSessionRegister(page: Page): Promise<void> {
  if (!process.env.E2E_RUN_ID?.trim()) return
  const run = e2eAuthSessionRunResolve(process.env)
  if (!run.success) throw new Error(run.errorMessage)
  const convexUrl = process.env.E2E_CLEANUP_CONVEX_URL?.trim()
  if (!convexUrl) return
  let token: string | undefined
  try {
    const session = await page.evaluate(async () => {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      const body = (await response.json()) as { session: { token: string } | null }
      return body.session
    })
    token = session?.token
  } catch {
    throw new Error("E2E auth session could not be read for registration; fixtures retained")
  }
  if (!token) throw new Error("E2E auth session is missing a token for registration; fixtures retained")
  const marked = await e2eAuthSessionMark({ convexUrl, runId: run.data, token })
  if (!marked.success) throw new Error("E2E auth session marking failed; fixtures retained")
}
