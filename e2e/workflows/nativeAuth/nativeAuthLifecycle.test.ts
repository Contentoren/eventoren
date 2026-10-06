import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { expect } from "@rstest/playwright"
import { ConvexHttpClient } from "convex/browser"
import type { Page } from "playwright"
import { api } from "../../../convex/_generated/api.js"
import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { eventorenE2eSignIn } from "../eventorenE2eSignIn.ts"
import { nativeAuthLifecycleEventFind } from "./nativeAuthLifecycleEventFind.ts"
import { nativeAuthLifecycleIdentityCreate } from "./nativeAuthLifecycleIdentityCreate.ts"

const environmentResult = e2eEnvironmentRead(process.env)
if (!environmentResult.success) throw new Error(environmentResult.errorMessage)
const baseUrl = environmentResult.data.baseUrl
const convexUrl = process.env.E2E_CLEANUP_CONVEX_URL?.trim()

type Session = { token: string; expiresAt: number }

async function adminEventFind(client: ConvexHttpClient, token: string, eventKey: string) {
  let cursor: string | null = null
  for (;;) {
    const result = await client.query(api.catalog.catalogEventListAdminPageQuery, {
      token,
      paginationOpts: { numItems: 50, cursor },
    })
    if (!result.success) throw new Error(`Authorized catalog read failed: ${result.errorMessage}`)
    const event = nativeAuthLifecycleEventFind(result.data.page, eventKey)
    if (event) return event
    if (result.data.isDone) return undefined
    cursor = result.data.continueCursor
  }
}

async function adminVisibleEventFind(client: ConvexHttpClient, token: string) {
  let cursor: string | null = null
  for (;;) {
    const result = await client.query(api.catalog.catalogEventListAdminPageQuery, {
      token,
      paginationOpts: { numItems: 50, cursor },
    })
    if (!result.success) throw new Error(`Authorized catalog read failed: ${result.errorMessage}`)
    const event = result.data.page.find((item) => item.status !== "archived")
    if (event) return event
    if (result.data.isDone) return undefined
    cursor = result.data.continueCursor
  }
}

async function sessionRead(page: Page): Promise<Session | null> {
  return page.evaluate(async () => {
    const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
    if (!response.ok) throw new Error(`/api/session returned ${response.status}`)
    const body = (await response.json()) as { session: Session | null }
    return body.session
  })
}

test("native auth keeps live catalog lifecycle scoped to active sessions", async ({
  page,
  browser,
  context,
  browserErrors,
}) => {
  if (!convexUrl) throw new Error("E2E_CLEANUP_CONVEX_URL is required for authorized exact-draft cleanup")

  const runId = (process.env.E2E_RUN_ID ?? crypto.randomUUID()).replaceAll(/[^a-zA-Z0-9-]/g, "-")
  // E2E_RUN_ID may intentionally be reused when resuming a run. A deleted event is
  // omitted from the authorized admin list but its eventKey remains reserved in Convex.
  const { eventKey, titleMarker, initialTitle, editedTitle } = nativeAuthLifecycleIdentityCreate(runId)
  const client = new ConvexHttpClient(convexUrl)
  const secondContext = await browser.newContext()
  let secondPage: Page | undefined
  let creatorToken: string | undefined
  let observerToken: string | undefined
  let draftCreated = false
  let testError: unknown
  const cleanupErrors: unknown[] = []
  let stepNumber = 0
  const step = (name: string): void => {
    stepNumber += 1
    console.info(`[native-auth-lifecycle ${stepNumber}] ${name}`)
  }
  const diagnosticDirectory = "/tmp/opencode"
  const tracePaths: { context: import("playwright").BrowserContext; path: string }[] = []

  try {
    await mkdir(diagnosticDirectory, { recursive: true })
    page.setDefaultTimeout(15_000)
    page.setDefaultNavigationTimeout(30_000)
    browserErrors.observe(secondContext)
    const observerPage = await secondContext.newPage()
    secondPage = observerPage
    observerPage.setDefaultTimeout(15_000)
    observerPage.setDefaultNavigationTimeout(30_000)
    // Sign in each browser context independently so the second remains authorized for cleanup.
    step("creator sign-in")
    await eventorenE2eSignIn(page, baseUrl, "/admin/events")
    step("creator /api/session ready")
    const creatorSession = await sessionRead(page)
    expect(creatorSession?.token).toBeTruthy()
    creatorToken = creatorSession?.token

    step("observer sign-in")
    await eventorenE2eSignIn(observerPage, baseUrl, "/admin/events")
    step("observer /api/session ready")
    const observerSession = await sessionRead(observerPage)
    expect(observerSession?.token).toBeTruthy()
    observerToken = observerSession?.token

    await secondContext.tracing.start({ screenshots: true, snapshots: true, sources: false })
    tracePaths.push({
      context: secondContext,
      path: join(diagnosticDirectory, `native-auth-lifecycle-${runId}-observer.zip`),
    })
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false })
    tracePaths.push({ context, path: join(diagnosticDirectory, `native-auth-lifecycle-${runId}-creator.zip`) })

    // Establish the observer's authenticated initial live-list result before creating the draft.
    // A pre-existing row prevents the draft's delayed initial response from masquerading as an update.
    step("observer initial live-list readiness")
    const initialVisibleEvent = await adminVisibleEventFind(client, observerToken as string)
    if (!initialVisibleEvent) throw new Error("Observer needs an existing non-archived event to prove initial load")
    await expect(observerPage.getByText(initialVisibleEvent.title, { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    })

    // Confirm this per-attempt key is not already visible before creating anything.
    expect(await adminEventFind(client, creatorToken as string, eventKey)).toBeUndefined()

    // Use the ordinary admin form; the run marker and unique key bind cleanup to this test's own draft.
    step("navigate to new-event form")
    await page.goto(`${baseUrl}/admin/events/new`)
    const eventForm = page.locator("form")
    step("fill title")
    await eventForm.getByLabel("Titel", { exact: true }).fill(initialTitle)
    step("open advanced section")
    const advancedSummary = eventForm.locator("details > summary").filter({ hasText: "Erweitert" })
    await expect(advancedSummary).toBeVisible()
    await advancedSummary.click()
    step("fill technical event key")
    const eventKeyInput = eventForm.getByLabel("Technischer Event-Key", { exact: true })
    await expect(eventKeyInput).toBeVisible()
    await eventKeyInput.fill(eventKey)
    step("save draft and verify edit form")
    draftCreated = true
    await eventForm.getByRole("button", { name: "Änderungen speichern" }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/events/${eventKey}$`))
    // The URL changes before the new-event form unmounts. Its title and hydration flag
    // also match, so wait for the detail route's own navigation before editing.
    await expect(
      page.getByRole("navigation", { name: "Eventbereiche" }).getByRole("link", { name: "Details", exact: true }),
    ).toHaveAttribute("href", `/admin/events/${eventKey}`)
    const editForm = page.locator("form")
    await expect(editForm).toHaveAttribute("data-hydrated", "true")
    await expect(editForm.getByLabel("Titel", { exact: true })).toHaveValue(initialTitle, { timeout: 15_000 })

    // The separately authenticated client observes creation via its live admin subscription without reload.
    step("observer receives created draft without reload")
    const observerEvent = observerPage.locator(`a[href="/admin/events/${eventKey}"]`)
    await expect(observerEvent.getByText(initialTitle, { exact: true })).toBeVisible({ timeout: 15_000 })
    const observerUrlBeforeEdit = observerPage.url()

    step("edit title, save, and verify observer live update")
    await editForm.getByLabel("Titel", { exact: true }).fill(editedTitle)
    await expect(editForm.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle)
    await editForm.getByRole("button", { name: "Änderungen speichern" }).click()
    await expect(editForm.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle, { timeout: 15_000 })
    await expect(page.getByText("Event gespeichert.", { exact: false })).toBeVisible({ timeout: 15_000 })
    await expect(observerEvent.getByText(editedTitle, { exact: true })).toBeVisible({ timeout: 15_000 })
    expect(observerPage.url()).toBe(observerUrlBeforeEdit)
    await expect(observerEvent.getByText(initialTitle, { exact: true })).toHaveCount(0)

    // Logout revokes the creator token, clears its memory session and removes protected page data.
    step("creator logout and protected-state removal")
    await page.locator("footer button").first().click()
    await page.getByRole("button", { name: "Abmelden" }).click()
    await expect.poll(() => sessionRead(page)).toBeNull()
    await expect(page.getByText(editedTitle, { exact: true })).toHaveCount(0)

    const revokedRead = await client.query(api.catalog.catalogEventListAdminPageQuery, {
      token: creatorToken as string,
      paginationOpts: { numItems: 50, cursor: null },
    })
    expect(revokedRead.success).toBe(false)
  } catch (error) {
    testError = error
    step(`failure captured at step ${stepNumber}; saving screenshot and trace`)
    await mkdir(diagnosticDirectory, { recursive: true }).catch(() => undefined)
    for (const [name, diagnosticPage] of [
      ["creator", page],
      ["observer", secondPage],
    ] as const) {
      if (!diagnosticPage) continue
      try {
        await diagnosticPage.screenshot({
          path: join(diagnosticDirectory, `native-auth-lifecycle-${runId}-${name}.png`),
          fullPage: true,
          mask: [diagnosticPage.locator("input")],
          timeout: 10_000,
        })
      } catch (diagnosticError) {
        cleanupErrors.push(new Error(`${name} failure screenshot could not be saved`, { cause: diagnosticError }))
      }
    }
    for (const trace of tracePaths) {
      try {
        await trace.context.tracing.stop({ path: trace.path })
      } catch (diagnosticError) {
        cleanupErrors.push(new Error("Failure trace could not be saved", { cause: diagnosticError }))
      }
    }
    console.info(`[native-auth-lifecycle] diagnostics: ${diagnosticDirectory}/native-auth-lifecycle-${runId}-*`)
  } finally {
    try {
      if (draftCreated && creatorToken && observerToken && secondPage) {
        step("cleanup: verify independently authorized ownership before deletion")
        // Prove the target still matches both unique run markers before invoking the supported, authorized delete API.
        const sessionStillActive = await sessionRead(secondPage)
        if (!sessionStillActive?.token || sessionStillActive.token !== observerToken) {
          cleanupErrors.push(new Error("Independent cleanup browser session is no longer active"))
        } else {
          const ownedDraft = await adminEventFind(client, observerToken, eventKey)
          if (!ownedDraft?.title.startsWith(titleMarker) || ownedDraft.status !== "draft") {
            cleanupErrors.push(
              new Error("Refusing cleanup: exact run-marked unpublished draft ownership proof did not match"),
            )
          } else {
            const deletion = await client.mutation(api.catalog.catalogEventDeleteMutation, {
              eventKey,
              token: observerToken,
            })
            if (!deletion.success || deletion.data.eventKey !== eventKey) {
              cleanupErrors.push(new Error(`Authorized owned-draft cleanup failed: ${JSON.stringify(deletion)}`))
            } else if (await adminEventFind(client, observerToken, eventKey)) {
              cleanupErrors.push(new Error("Authorized cleanup returned success but the owned draft remains visible"))
            } else {
              console.info(`[native-auth-lifecycle] authorized cleanup confirmed for owned draft ${eventKey}`)
            }
          }
        }
      }
    } catch (error) {
      cleanupErrors.push(new Error("Authorized owned-draft cleanup/confirmation failed", { cause: error }))
    } finally {
      if (!testError) {
        for (const trace of tracePaths) {
          try {
            await trace.context.tracing.stop()
          } catch (error) {
            cleanupErrors.push(error)
          }
        }
      }
      try {
        await secondContext.close()
      } catch (error) {
        cleanupErrors.push(new Error("Observer browser context close failed", { cause: error }))
      }
    }
  }

  if (testError && cleanupErrors.length > 0) {
    throw new AggregateError([testError, ...cleanupErrors], "Native auth lifecycle failed; cleanup diagnostics follow")
  }
  if (testError) throw testError
  if (cleanupErrors.length > 0) {
    const details = cleanupErrors.map((error, index) => {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
      return `cleanup error ${index + 1}: ${message}`
    })
    throw new AggregateError(cleanupErrors, `Native auth lifecycle cleanup failed\n${details.join("\n")}`)
  }
}, 120_000)
