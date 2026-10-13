import { createHash } from "node:crypto"
import { ConvexHttpClient } from "convex/browser"
import { createResult, createResultError } from "#result"
import { api } from "../../convex/_generated/api.js"
import { e2eAuthSessionMark } from "./e2eAuthSessionMark.ts"
import { e2eAuthCredentialsGet } from "../config/e2eAuthCredentialsGet.ts"

const targetOrigins = ["https://eventoren.de", "https://eventoren.leonardomora.de"] as const

type CleanupSessionBrowserHandle = {
  token: string
  close: () => Promise<void>
}

type CleanupSessionBrowserLogin = (args: {
  baseUrl: string
  username: string
  password: string
}) => Promise<CleanupSessionBrowserHandle>

type CleanupSessionVerifyData = {
  role: string
  userId: string
  sessionId?: string
}

type CleanupSessionVerifyResult =
  | { success: true; data: CleanupSessionVerifyData }
  | { success: false; op: string; errorMessage: string }

type CleanupSessionVerify = (args: { convexUrl: string; token: string }) => Promise<CleanupSessionVerifyResult>

type CleanupSessionMarkResult =
  | { success: true; data?: unknown }
  | { success: false; op?: string; errorMessage?: string }

type CleanupSessionMark = (args: { token: string; runId: string }) => Promise<CleanupSessionMarkResult>

export type E2eInvocationCleanupSessionDeps = {
  browserLogin?: CleanupSessionBrowserLogin
  sessionVerify?: CleanupSessionVerify
  mark?: CleanupSessionMark
}

/**
 * Create a standalone cleanup session for the exact outer E2E run.
 *
 * Explicit `E2E_CLEANUP_ADMIN_TOKEN` is verified as a live admin via the
 * existing `api.auth.authCurrentUserGetQuery` (token-only, never cookie
 * inference) and returned unmarked (`owned: false`); a shared token is never
 * adopted. Otherwise fresh testadmin credentials (existing
 * `e2eAuthCredentialsGet` module default) drive a new SSO browser login at
 * `/sso?returnTo=%2Fadmin`, the exact new `eventoren-session` cookie/token
 * stays in memory, the session is verified as admin and marked with the
 * existing `e2eAuthSessionMark` for the same outer run before close
 * (private ID/digest evidence only, token never persisted). The browser/client
 * always closes; a failure never deletes a server session. The token is
 * returned to the controller only.
 */
export async function e2eInvocationCleanupSessionCreate(input: {
  targetBaseUrl: string
  convexUrl: string
  runId: string
  env: Record<string, string | undefined>
  deps?: E2eInvocationCleanupSessionDeps
  browserLogin?: CleanupSessionBrowserLogin
  sessionVerify?: CleanupSessionVerify
  mark?: CleanupSessionMark
}) {
  const op = "e2eInvocationCleanupSessionCreate"
  const baseUrl = e2eInvocationCleanupSessionBaseUrlResolve(input.targetBaseUrl)
  if (!baseUrl) return createResultError(op, "E2E cleanup target must be the canonical Eventoren origin")
  const convexUrl = input.convexUrl.trim()
  if (!convexUrl) return createResultError(op, "Missing E2E cleanup Convex URL")
  try {
    const parsed = new URL(convexUrl)
    if (parsed.protocol !== "https:") return createResultError(op, "Missing E2E cleanup Convex URL")
  } catch {
    return createResultError(op, "Missing E2E cleanup Convex URL")
  }
  if (!/^[0-9a-z]+-[0-9a-f-]{36}$/u.test(input.runId)) return createResultError(op, "Invalid E2E run marker")
  const deps = input.deps ?? {}
  const browserLogin = input.browserLogin ?? deps.browserLogin ?? e2eInvocationCleanupSessionBrowserLogin
  const sessionVerify = input.sessionVerify ?? deps.sessionVerify ?? e2eInvocationCleanupSessionVerify
  const mark = input.mark ?? deps.mark

  const explicitToken = input.env.E2E_CLEANUP_ADMIN_TOKEN?.trim()
  if (explicitToken) {
    let verified: CleanupSessionVerifyResult
    try {
      verified = await sessionVerify({ convexUrl, token: explicitToken })
    } catch {
      return createResultError(op, "Cleanup admin session verification unavailable; server session retained")
    }
    if (!verified.success)
      return createResultError(op, "Cleanup admin session verification rejected; server session retained")
    if (verified.data.role !== "admin")
      return createResultError(op, "Cleanup admin token is not an admin session; server session retained")
    if (!verified.data.userId)
      return createResultError(op, "Cleanup admin session verification rejected; server session retained")
    const tokenDigest = createHash("sha256").update(explicitToken, "utf8").digest("hex")
    return createResult({
      token: explicitToken,
      sessionId: verified.data.sessionId ?? verified.data.userId,
      owned: false as const,
      tokenDigest,
    })
  }

  const credentials = e2eAuthCredentialsGet(input.env)
  if (!credentials.success) return createResultError(op, credentials.errorMessage)
  let handle: CleanupSessionBrowserHandle | undefined
  try {
    try {
      handle = await browserLogin({
        baseUrl,
        username: credentials.data.username,
        password: credentials.data.password,
      })
    } catch {
      return createResultError(op, "Cleanup browser login failed; server session retained")
    }
    const token = handle.token
    if (!token) {
      return createResultError(op, "Cleanup browser login returned no session; server session retained")
    }
    let verified: CleanupSessionVerifyResult
    try {
      verified = await sessionVerify({ convexUrl, token })
    } catch {
      return createResultError(op, "Cleanup session verification unavailable; server session retained")
    }
    if (!verified.success)
      return createResultError(op, "Cleanup session verification rejected; server session retained")
    if (verified.data.role !== "admin")
      return createResultError(op, "Cleanup session is not an admin session; server session retained")
    const markFn: CleanupSessionMark =
      mark ??
      (async (args) =>
        e2eAuthSessionMark({
          convexUrl,
          runId: input.runId,
          token: args.token,
          environment: input.env,
          directory: input.env.E2E_CHECKPOINT_DIRECTORY,
        })
          .then((marked) => {
            if (!marked.success)
              return { success: false as const, errorMessage: "Auth session marking rejected; fixtures retained" }
            return { success: true as const, data: marked.data }
          })
          .catch(() => ({ success: false as const, errorMessage: "Auth session marking unavailable" })))
    // The mark seam receives the same outer run; the default above closes over
    // the validated convexUrl/runId and persists digest-only evidence.
    let marked: CleanupSessionMarkResult
    try {
      marked = await markFn({ token, runId: input.runId })
    } catch {
      return createResultError(op, "Cleanup session marking failed; server session retained")
    }
    if (!marked.success) return createResultError(op, "Cleanup session marking failed; server session retained")
    const sessionId = (marked.data as { sessionId?: unknown } | undefined)?.sessionId
    if (typeof sessionId !== "string" || !sessionId)
      return createResultError(op, "Cleanup session marking returned no session identity; server session retained")
    const tokenDigest = createHash("sha256").update(token, "utf8").digest("hex")
    return createResult({ token, sessionId, owned: true as const, tokenDigest })
  } finally {
    if (handle) {
      try {
        await handle.close()
      } catch {
        // Browser/client close only; never a server deletion.
      }
    }
  }
}

function e2eInvocationCleanupSessionBaseUrlResolve(raw: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    return null
  }
  if (
    !(targetOrigins as readonly string[]).includes(parsed.origin) ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password
  ) {
    // Accept a bare origin with or without trailing slash only.
    if (parsed.origin && (targetOrigins as readonly string[]).includes(parsed.origin)) return parsed.origin
    return null
  }
  return parsed.origin
}

/**
 * Default fresh-SSO browser login using the actual Eventoren SSO/token
 * bootstrap: fresh context at `/sso?returnTo=%2Fadmin`, existing
 * `Continue with Zitadel` link, Zitadel login/password, actual
 * frontend `/admin`, then the exact new `eventoren-session` cookie plus the
 * in-memory `/api/session` token. Lazily imports playwright so offline unit
 * tests with an injected seam never open a browser.
 */
async function e2eInvocationCleanupSessionBrowserLogin(input: {
  baseUrl: string
  username: string
  password: string
}): Promise<CleanupSessionBrowserHandle> {
  const { chromium } = await import("playwright")
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  const close = async () => {
    try {
      await context.close()
    } catch {
      // Close-only; never delete a server session.
    }
    try {
      await browser.close()
    } catch {
      // Close-only; never delete a server session.
    }
  }
  try {
    const origin = new URL(input.baseUrl).origin
    const destination = `${origin}/sso?returnTo=${encodeURIComponent("/admin")}`
    await page.goto(destination)
    if (new URL(page.url()).origin === origin) {
      const signIn = page.getByRole("link", { name: /continue with zitadel/i })
      await signIn.waitFor({ state: "visible", timeout: 60_000 })
      await Promise.all([page.waitForURL((url) => url.origin !== origin, { timeout: 60_000 }), signIn.click()])
    }
    if (new URL(page.url()).origin !== origin) {
      const username = page.getByRole("textbox", { name: /loginname|username|email/i })
      await username.waitFor({ state: "visible", timeout: 60_000 })
      await username.fill(input.username)
      await page.getByRole("button", { name: /next|continue|weiter/i }).click()
      const password = page.getByRole("textbox", { name: /password|passwort/i })
      await password.waitFor({ state: "visible", timeout: 60_000 })
      await password.fill(input.password)
      await page.getByRole("button", { name: /next|continue|sign in|log in|weiter|anmelden/i }).click()
      await page.waitForURL((url) => url.origin === origin && url.pathname.startsWith("/admin"), { timeout: 60_000 })
    }
    await page.waitForFunction(
      async () => {
        const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
        const body = (await response.json()) as { session: unknown }
        return (
          response.status === 200 &&
          Boolean(body.session) &&
          (response.headers.get("cache-control") ?? "").includes("no-store")
        )
      },
      undefined,
      { timeout: 60_000 },
    )
    const session = await page.evaluate(async () => {
      const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      const body = (await response.json()) as { session: { token: string } | null }
      return body.session
    })
    const token = session?.token
    if (!token) throw new Error("Cleanup browser login returned no session")
    const cookies = await context.cookies()
    if (!cookies.some((cookie) => cookie.name === "eventoren-session" && cookie.value))
      throw new Error("Cleanup browser login missed the session cookie")
    return { token, close }
  } catch (error) {
    await close()
    throw error
  }
}

/**
 * Default token-only admin verification via the existing
 * `api.auth.authCurrentUserGetQuery`. No cookie inference.
 */
async function e2eInvocationCleanupSessionVerify(input: {
  convexUrl: string
  token: string
}): Promise<CleanupSessionVerifyResult> {
  const op = "e2eInvocationCleanupSessionCreate"
  try {
    const current = await new ConvexHttpClient(input.convexUrl).query(api.auth.authCurrentUserGetQuery, {
      token: input.token,
    })
    if (!current.success) return { success: false, op, errorMessage: "Cleanup session verification rejected" }
    const profile = current.data as { role?: unknown; userId?: unknown }
    if (typeof profile.userId !== "string" || !profile.userId)
      return { success: false, op, errorMessage: "Cleanup session verification rejected" }
    return {
      success: true,
      data: { role: String(profile.role), userId: profile.userId },
    }
  } catch {
    return { success: false, op, errorMessage: "Cleanup session verification unavailable" }
  }
}
