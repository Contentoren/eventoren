import { expect } from "@rstest/playwright"
import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { eventorenE2eSignIn } from "../eventorenE2eSignIn.ts"

const environmentResult = e2eEnvironmentRead(process.env)
if (!environmentResult.success) throw new Error(environmentResult.errorMessage)
const baseUrl = environmentResult.data.baseUrl

test("authenticated session bootstrap is never cacheable", async ({ page }) => {
  await eventorenE2eSignIn(page, baseUrl, "/")
  const response = await page.evaluate(async () => {
    const result = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
    return { status: result.status, cacheControl: result.headers.get("cache-control"), body: await result.json() }
  })
  expect(response.status).toBe(200)
  expect(response.cacheControl).toContain("no-store")
  expect(response.body.session).not.toBeNull()
})

test("anonymous catalogue repeats reuse a cache entry and isolate query parameters", async ({ request }) => {
  const runId = process.env.E2E_RUN_ID ?? crypto.randomUUID()
  const invocationId = crypto.randomUUID()
  const primaryUrl = `${baseUrl}/api/catalogue?q=${encodeURIComponent(`native-auth-${runId}-${invocationId}`)}`
  const isolatedUrl = `${baseUrl}/api/catalogue?q=${encodeURIComponent(`native-auth-isolated-${runId}-${invocationId}`)}`

  const first = await request.get(primaryUrl)
  expect(first.status()).toBe(200)
  expect(first.headers()["cache-control"]).toContain("public")
  expect(first.headers()["cache-control"]).toContain("max-age=60")
  expect(["HIT", "MISS"]).toContain(first.headers()["x-public-catalogue-cache"])

  const repeated = await request.get(primaryUrl)
  expect(repeated.status()).toBe(200)
  expect(repeated.headers()["x-public-catalogue-cache"]).toBe("HIT")

  const isolated = await request.get(isolatedUrl)
  expect(isolated.status()).toBe(200)
  expect(["HIT", "MISS"]).toContain(isolated.headers()["x-public-catalogue-cache"])
  expect(isolated.url()).not.toBe(repeated.url())
})
