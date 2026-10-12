import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { expect } from "@rstest/playwright"
import { ConvexHttpClient } from "convex/browser"
import type { Page } from "playwright"
import { api } from "../../../convex/_generated/api.js"
import { e2eCheckpointRootResolve } from "../../checkpoint/e2eCheckpointRootResolve.ts"
import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { eventorenE2eSignIn } from "../eventorenE2eSignIn.ts"
import { nativeAuthLifecycleCheckpointLoad } from "./nativeAuthLifecycleCheckpointLoad.ts"
import { nativeAuthLifecycleCheckpointSave } from "./nativeAuthLifecycleCheckpointSave.ts"
import type { NativeAuthLifecycleCheckpoint } from "./nativeAuthLifecycleCheckpointSchema.ts"
import { nativeAuthLifecycleEventFind } from "./nativeAuthLifecycleEventFind.ts"
import { nativeAuthLifecycleIdentityCreate } from "./nativeAuthLifecycleIdentityCreate.ts"
import { nativeAuthLifecycleOwnershipProve } from "./nativeAuthLifecycleOwnershipProve.ts"
import { nativeAuthLifecycleStepRun, type NativeAuthLifecycleStepContext } from "./nativeAuthLifecycleStepRun.ts"

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
    // Admin pages omit hard-deleted rows but include archived ones, so an
    // exact key lookup reconciles archived current-run data as well. A deleted
    // key stays reserved in Convex and surfaces as a form error for repair.
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
    const event = result.data.page.find((item: { status: string }) => item.status !== "archived")
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

  // The direct runner uses the same checkpoint target identity as the
  // invocation runner: it resumes the retained run when E2E_RUN_ID is absent
  // and refuses foreign runs or targets instead of creating replacements.
  const root = await e2eCheckpointRootResolve()
  if (!root.success) throw new Error(root.errorMessage)
  const directory = root.data.directory
  const target = { target: environmentResult.data.target, baseUrl: environmentResult.data.baseUrl }
  const stored = await nativeAuthLifecycleCheckpointLoad(directory, target)
  if (!stored.success) throw new Error(stored.errorMessage)
  const requestedRunId = process.env.E2E_RUN_ID?.trim()
  if (stored.data && requestedRunId && stored.data.runId !== requestedRunId) {
    throw new Error("Lifecycle checkpoint belongs to another run; reconcile it manually before retrying")
  }
  const runId = stored.data?.runId ?? requestedRunId ?? `direct-${crypto.randomUUID()}`
  // The identity is stable per run, so a repaired resume reconciles the same
  // exact event key instead of creating another draft.
  const identity = nativeAuthLifecycleIdentityCreate(runId)
  const { eventKey, initialTitle, editedTitle } = identity
  let retained: NativeAuthLifecycleCheckpoint | null = stored.data
  if (!retained) {
    // Persist intent before the first uncertain create effect.
    const saved = await nativeAuthLifecycleCheckpointSave(directory, {
      version: 1,
      target: target.target,
      baseUrl: target.baseUrl as NativeAuthLifecycleCheckpoint["baseUrl"],
      runId,
      createdAt: Date.now(),
      step: "create",
      status: "started",
      ...identity,
    })
    if (!saved.success) throw new Error(saved.errorMessage)
    const reloaded = await nativeAuthLifecycleCheckpointLoad(directory, target)
    if (!reloaded.success) throw new Error(reloaded.errorMessage)
    if (!reloaded.data) throw new Error("Lifecycle intent was not retained")
    retained = reloaded.data
  }
  const stepContext: NativeAuthLifecycleStepContext = { directory, checkpoint: retained }
  const client = new ConvexHttpClient(convexUrl)
  const secondContext = await browser.newContext()
  let secondPage: Page | undefined
  let creatorToken: string | undefined
  let testError: unknown
  const diagnosticErrors: unknown[] = []
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
    // Browser sessions are always rebuilt: sign-in reruns on every resume and
    // durability only covers the fixture steps below.
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
    const initialVisibleEvent = await adminVisibleEventFind(client, observerSession?.token as string)
    if (!initialVisibleEvent) throw new Error("Observer needs an existing non-archived event to prove initial load")
    await expect(observerPage.getByText(initialVisibleEvent.title, { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    })

    // Use the ordinary admin form; the stable run marker and unique key bind cleanup to this run's own draft.
    await nativeAuthLifecycleStepRun(stepContext, "create", false, async () => {
      step("reconcile exact draft before create")
      const existing = await adminEventFind(client, creatorToken as string, eventKey)
      const proved = nativeAuthLifecycleOwnershipProve(
        existing ? { eventKey: existing.id, title: existing.title, status: existing.status } : undefined,
        identity,
      )
      if (!proved.success) throw new Error(proved.errorMessage)
      if (!proved.data.adopted) {
        // Confirm this run key is not already visible before creating anything.
        step("navigate to new-event form")
        await page.goto(`${baseUrl}/admin/events/new`)
        const eventForm = page.locator("form")
        // The new-event form hydrates after its JS chunks load. Fills before
        // hydration never reach the draft signal, so the save below would see
        // an empty draft despite filled DOM inputs. The edit path already
        // waits for this flag; the create path must do the same.
        await expect(eventForm).toHaveAttribute("data-hydrated", "true", { timeout: 15_000 })
        step("fill title")
        await eventForm.getByLabel("Titel", { exact: true }).fill(initialTitle)
        await expect(eventForm.getByLabel("Titel", { exact: true })).toHaveValue(initialTitle)
        step("open advanced section")
        const advancedSummary = eventForm.locator("details > summary").filter({ hasText: "Erweitert" })
        await expect(advancedSummary).toBeVisible()
        await advancedSummary.click()
        step("fill technical event key")
        const eventKeyInput = eventForm.getByLabel("Technischer Event-Key", { exact: true })
        await expect(eventKeyInput).toBeVisible()
        await eventKeyInput.fill(eventKey)
        await expect(eventKeyInput).toHaveValue(eventKey)
        step("save draft and verify edit form")
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
      } else {
        step(`adopted existing draft with title "${existing?.title}" instead of creating a replacement`)
        await page.goto(`${baseUrl}/admin/events/${eventKey}`)
        const editForm = page.locator("form")
        await expect(editForm).toHaveAttribute("data-hydrated", "true")
        await expect(editForm.getByLabel("Titel", { exact: true })).toHaveValue(existing?.title ?? "", {
          timeout: 15_000,
        })
      }

      // The separately authenticated client observes creation via its live admin subscription without reload.
      step("observer receives created draft without reload")
      const owned = await adminEventFind(client, creatorToken as string, eventKey)
      if (!owned) throw new Error("Lifecycle draft is missing after create; reconcile it manually")
      const observerEvent = observerPage.locator(`a[href="/admin/events/${eventKey}"]`)
      await expect(observerEvent.getByText(owned.title, { exact: true })).toBeVisible({ timeout: 15_000 })
    })

    await nativeAuthLifecycleStepRun(stepContext, "edit", false, async () => {
      step("reconcile exact draft before edit")
      const owned = await adminEventFind(client, creatorToken as string, eventKey)
      const proved = nativeAuthLifecycleOwnershipProve(
        owned ? { eventKey: owned.id, title: owned.title, status: owned.status } : undefined,
        identity,
      )
      if (!proved.success) throw new Error(proved.errorMessage)
      if (!proved.data.adopted) {
        throw new Error("Verified lifecycle draft is missing before edit; reconcile it manually instead of recreating")
      }
      const observerEvent = observerPage.locator(`a[href="/admin/events/${eventKey}"]`)
      const observerUrlBeforeEdit = observerPage.url()
      if (owned?.title !== editedTitle) {
        step("edit title, save, and verify observer live update")
        await page.goto(`${baseUrl}/admin/events/${eventKey}`)
        const editForm = page.locator("form")
        await expect(editForm).toHaveAttribute("data-hydrated", "true")
        await editForm.getByLabel("Titel", { exact: true }).fill(editedTitle)
        await expect(editForm.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle)
        await editForm.getByRole("button", { name: "Änderungen speichern" }).click()
        await expect(editForm.getByLabel("Titel", { exact: true })).toHaveValue(editedTitle, { timeout: 15_000 })
        await expect(page.getByText("Event gespeichert.", { exact: false })).toBeVisible({ timeout: 15_000 })
      } else {
        step("adopted already-edited draft without repeating the form edit")
      }
      await expect(observerEvent.getByText(editedTitle, { exact: true })).toBeVisible({ timeout: 15_000 })
      expect(observerPage.url()).toBe(observerUrlBeforeEdit)
      await expect(observerEvent.getByText(initialTitle, { exact: true })).toHaveCount(0)
    })

    // The creator logout is a required destructive session assertion kept as
    // an explicit durable step; it is not fixture cleanup. The draft itself is
    // retained: only the whole-invocation success barrier may remove it.
    await nativeAuthLifecycleStepRun(stepContext, "verify", false, async () => {
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
    })
    console.info(`[native-auth-lifecycle] run ${runId} verified; draft ${eventKey} retained for barrier cleanup`)
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
        diagnosticErrors.push(new Error(`${name} failure screenshot could not be saved`, { cause: diagnosticError }))
      }
    }
    for (const trace of tracePaths) {
      try {
        await trace.context.tracing.stop({ path: trace.path })
      } catch (diagnosticError) {
        diagnosticErrors.push(new Error("Failure trace could not be saved", { cause: diagnosticError }))
      }
    }
    console.info(`[native-auth-lifecycle] diagnostics: ${diagnosticDirectory}/native-auth-lifecycle-${runId}-*`)
  } finally {
    // Fixture and step state are retained on failure for resume and on success
    // for the invocation barrier; this workflow never deletes the draft.
    try {
      if (!testError) {
        for (const trace of tracePaths) {
          try {
            await trace.context.tracing.stop()
          } catch (error) {
            diagnosticErrors.push(error)
          }
        }
      }
    } finally {
      try {
        await secondContext.close()
      } catch (error) {
        diagnosticErrors.push(new Error("Observer browser context close failed", { cause: error }))
      }
    }
  }

  if (testError && diagnosticErrors.length > 0) {
    throw new AggregateError([testError, ...diagnosticErrors], "Native auth lifecycle failed; diagnostics follow")
  }
  if (testError) throw testError
  if (diagnosticErrors.length > 0) {
    const details = diagnosticErrors.map((error, index) => {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
      return `diagnostic error ${index + 1}: ${message}`
    })
    throw new AggregateError(diagnosticErrors, `Native auth lifecycle diagnostics failed\n${details.join("\n")}`)
  }
}, 120_000)
