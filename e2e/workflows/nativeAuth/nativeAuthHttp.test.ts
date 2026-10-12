import { expect } from "@rstest/playwright"
import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"
import { e2eCheckpointRootResolve } from "../../checkpoint/e2eCheckpointRootResolve.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { eventorenE2eSignIn } from "../eventorenE2eSignIn.ts"
import { nativeAuthCatalogueCachePolicyGet } from "./nativeAuthCatalogueCachePolicyGet.ts"
import { nativeAuthHttpCheckpoint, type NativeAuthHttpCheckpoint } from "./nativeAuthHttpCheckpoint.ts"

const environmentResult = e2eEnvironmentRead(process.env)
if (!environmentResult.success) throw new Error(environmentResult.errorMessage)
const baseUrl = environmentResult.data.baseUrl
const target = environmentResult.data.target
const binding = { target, baseUrl: baseUrl as NativeAuthHttpCheckpoint["baseUrl"] }

async function httpCheckpointDirectoryGet(): Promise<string> {
  const root = await e2eCheckpointRootResolve()
  if (!root.success) throw new Error(root.errorMessage)
  return root.data.directory
}

/** Resolve the actual outer-runner run. Never invent a replacement run. */
function httpRunIdGet(storedRunId: string | undefined): string {
  const requested = process.env.E2E_RUN_ID?.trim()
  if (storedRunId && requested && storedRunId !== requested) {
    throw new Error("HTTP checkpoint belongs to another run; reconcile it manually before retrying")
  }
  const runId = storedRunId ?? requested ?? `direct-${crypto.randomUUID()}`
  if (!/^[0-9a-z]+-[0-9a-f-]{36}$/u.test(runId)) {
    throw new Error("HTTP run marker is not a valid E2E run; reconcile it manually before retrying")
  }
  return runId
}

test("authenticated session bootstrap is never cacheable", async ({ page }) => {
  const directory = await httpCheckpointDirectoryGet()
  const stored = await nativeAuthHttpCheckpoint.load(directory, binding)
  if (!stored.success) throw new Error(stored.errorMessage)
  const runId = httpRunIdGet(stored.data?.runId)
  if (stored.data && nativeAuthHttpCheckpoint.isStepCompleted(stored.data, "authenticated-bootstrap")) {
    console.info(`[native-auth-http] run ${stored.data.runId} bootstrap already verified; no duplicate sign-in`)
    return
  }
  if (!stored.data) {
    // Persist intent before the first uncertain auth effect.
    const marked = await nativeAuthHttpCheckpoint.save(directory, {
      version: 1,
      target: binding.target,
      baseUrl: binding.baseUrl,
      runId,
      createdAt: Date.now(),
      workflow: "native auth HTTP",
      step: "authenticated-bootstrap",
      status: "started",
    })
    if (!marked.success) throw new Error(marked.errorMessage)
  }
  await eventorenE2eSignIn(page, baseUrl, "/")
  const response = await page.evaluate(async () => {
    const result = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
    return { status: result.status, cacheControl: result.headers.get("cache-control"), body: await result.json() }
  })
  expect(response.status).toBe(200)
  expect(response.cacheControl).toContain("no-store")
  expect(response.body.session).not.toBeNull()
  // Complete only after the actual asserts above; failures retain the
  // started checkpoint and the registered auth ownership for resume.
  const reloaded = await nativeAuthHttpCheckpoint.load(directory, binding)
  if (!reloaded.success) throw new Error(reloaded.errorMessage)
  if (
    !reloaded.data ||
    reloaded.data.runId !== runId ||
    reloaded.data.step !== "authenticated-bootstrap" ||
    reloaded.data.status !== "started"
  ) {
    throw new Error("HTTP bootstrap checkpoint changed; reconcile before continuing")
  }
  const done = await nativeAuthHttpCheckpoint.save(directory, { ...reloaded.data, status: "completed" })
  if (!done.success) throw new Error(done.errorMessage)
})

test("anonymous catalogue repeats reuse a cache entry and isolate query parameters", async ({ request }) => {
  const directory = await httpCheckpointDirectoryGet()
  const stored = await nativeAuthHttpCheckpoint.load(directory, binding)
  if (!stored.success) throw new Error(stored.errorMessage)
  const runId = httpRunIdGet(stored.data?.runId)
  if (stored.data && nativeAuthHttpCheckpoint.isStepCompleted(stored.data, "anonymous-catalogue")) {
    console.info(`[native-auth-http] run ${stored.data.runId} catalogue already verified; no repeat requests`)
    return
  }
  if (!stored.data || !nativeAuthHttpCheckpoint.isStepCompleted(stored.data, "authenticated-bootstrap")) {
    throw new Error("HTTP bootstrap is not verified for this run; resume at the first unfinished step")
  }
  const started = await nativeAuthHttpCheckpoint.save(directory, {
    ...stored.data,
    step: "anonymous-catalogue",
    status: "started",
  })
  if (!started.success) throw new Error(started.errorMessage)
  const invocationId = crypto.randomUUID()
  const primaryUrl = `${baseUrl}/api/catalogue?q=${encodeURIComponent(`native-auth-${runId}-${invocationId}`)}`
  const isolatedUrl = `${baseUrl}/api/catalogue?q=${encodeURIComponent(`native-auth-isolated-${runId}-${invocationId}`)}`
  // Production runs behind the Cloudflare edge cache (caches.default) and
  // must HIT on repeat. Development serves from the local Vite SSR runtime
  // with no edge cache, so cataloguePublicHttpCacheGet deterministically
  // marks BYPASS while keeping the same public cache-control response.
  const policy = nativeAuthCatalogueCachePolicyGet(target)

  const first = await request.get(primaryUrl)
  expect(first.status()).toBe(200)
  expect(first.headers()["cache-control"]).toContain("public")
  expect(first.headers()["cache-control"]).toContain("max-age=60")
  expect(policy.first).toContain(first.headers()["x-public-catalogue-cache"])
  const firstBody = (await first.json()) as { page?: unknown; session?: unknown }
  expect(Array.isArray(firstBody.page)).toBe(true)
  expect(firstBody.session).toBeUndefined()

  const repeated = await request.get(primaryUrl)
  expect(repeated.status()).toBe(200)
  expect(repeated.headers()["x-public-catalogue-cache"]).toBe(policy.repeated)
  expect(await repeated.json()).toEqual(firstBody)

  const isolated = await request.get(isolatedUrl)
  expect(isolated.status()).toBe(200)
  expect(policy.isolated).toContain(isolated.headers()["x-public-catalogue-cache"])
  expect(isolated.url()).not.toBe(repeated.url())
  const isolatedBody = (await isolated.json()) as { page?: unknown; session?: unknown }
  expect(Array.isArray(isolatedBody.page)).toBe(true)
  expect(isolatedBody.session).toBeUndefined()
  // Complete only after the actual asserts above; failures retain the
  // started catalogue step for retry without rerunning the bootstrap login.
  const reloaded = await nativeAuthHttpCheckpoint.load(directory, binding)
  if (!reloaded.success) throw new Error(reloaded.errorMessage)
  if (
    !reloaded.data ||
    reloaded.data.runId !== runId ||
    reloaded.data.step !== "anonymous-catalogue" ||
    reloaded.data.status !== "started"
  ) {
    throw new Error("HTTP catalogue checkpoint changed; reconcile before continuing")
  }
  const done = await nativeAuthHttpCheckpoint.save(directory, { ...reloaded.data, status: "completed" })
  if (!done.success) throw new Error(done.errorMessage)
})
