import { expect } from "@rstest/playwright"
import { ConvexHttpClient } from "convex/browser"
import type { Page } from "playwright"
import { api } from "../../../convex/_generated/api.js"
import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { eventorenE2eSignIn } from "../eventorenE2eSignIn.ts"

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
    const event = result.data.page.find((item) => item.eventKey === eventKey)
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

test("native auth keeps live catalog lifecycle scoped to active sessions", async ({ page, browser, browserErrors }) => {
  if (!convexUrl) throw new Error("E2E_CLEANUP_CONVEX_URL is required for authorized exact-draft cleanup")

  const runId = (process.env.E2E_RUN_ID ?? crypto.randomUUID()).replaceAll(/[^a-zA-Z0-9-]/g, "-")
  const eventKey = `native-auth-${runId}`
  const titleMarker = `[native-auth-e2e:${runId}]`
  const initialTitle = `${titleMarker} lifecycle draft`
  const editedTitle = `${titleMarker} lifecycle edited`
  const client = new ConvexHttpClient(convexUrl)
  const secondContext = await browser.newContext()
  let secondPage: Page | undefined
  let creatorToken: string | undefined
  let observerToken: string | undefined
  let draftCreated = false
  let testError: unknown
  const cleanupErrors: unknown[] = []

  try {
    browserErrors.observe(secondContext)
    const observerPage = await secondContext.newPage()
    secondPage = observerPage
    // Sign in each browser context independently so the second remains authorized for cleanup.
    await eventorenE2eSignIn(page, baseUrl, "/admin/events")
    const creatorSession = await sessionRead(page)
    expect(creatorSession?.token).toBeTruthy()
    creatorToken = creatorSession?.token

    await eventorenE2eSignIn(observerPage, baseUrl, "/admin/events")
    const observerSession = await sessionRead(observerPage)
    expect(observerSession?.token).toBeTruthy()
    observerToken = observerSession?.token

    // Establish the observer's authenticated initial live-list result before creating the draft.
    // A pre-existing row prevents the draft's delayed initial response from masquerading as an update.
    const initialVisibleEvent = await adminVisibleEventFind(client, observerToken as string)
    if (!initialVisibleEvent) throw new Error("Observer needs an existing non-archived event to prove initial load")
    await expect(observerPage.getByText(initialVisibleEvent.title, { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    })

    // Avoid key reuse even if a prior interrupted run left a resource behind.
    expect(await adminEventFind(client, creatorToken as string, eventKey)).toBeUndefined()

    // Use the ordinary admin form; the run marker and unique key bind cleanup to this test's own draft.
    await page.goto(`${baseUrl}/admin/events/new`)
    await page.getByLabel("Titel", { exact: true }).fill(initialTitle)
    await page.locator("#admin-event-key").fill(eventKey)
    draftCreated = true
    await page.getByRole("button", { name: "Änderungen speichern" }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/events/${eventKey}$`))
    await expect(page.getByLabel("Titel", { exact: true })).toHaveValue(initialTitle, { timeout: 30_000 })

    // The separately authenticated client observes creation via its live admin subscription without reload.
    await expect(observerPage.getByText(initialTitle, { exact: true })).toBeVisible({ timeout: 30_000 })
    const observerUrlBeforeEdit = observerPage.url()

    await page.getByLabel("Titel", { exact: true }).fill(editedTitle)
    await page.getByRole("button", { name: "Änderungen speichern" }).click()
    await expect(page.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle, { timeout: 30_000 })
    await expect(page.getByText("Event gespeichert.", { exact: false })).toBeVisible({ timeout: 30_000 })
    await expect(observerPage.getByText(editedTitle, { exact: true })).toBeVisible({ timeout: 30_000 })
    expect(observerPage.url()).toBe(observerUrlBeforeEdit)
    await expect(observerPage.getByText(initialTitle, { exact: true })).toHaveCount(0)

    // Logout revokes the creator token, clears its memory session and removes protected page data.
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
  } finally {
    try {
      if (draftCreated && creatorToken && observerToken && secondPage) {
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
            }
          }
        }
      }
    } catch (error) {
      cleanupErrors.push(error)
    } finally {
      try {
        await secondContext.close()
      } catch (error) {
        cleanupErrors.push(error)
      }
    }
  }

  if (testError && cleanupErrors.length > 0) {
    throw new AggregateError([testError, ...cleanupErrors], "Native auth lifecycle failed; cleanup diagnostics follow")
  }
  if (testError) throw testError
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Native auth lifecycle cleanup failed")
  }
})
