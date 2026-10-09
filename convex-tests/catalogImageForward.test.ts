import { afterEach, expect, test, vi } from "vitest"
import { catalogImageForward } from "../src/catalog/convex/catalogImageForward.ts"

const calls: { path: string; method: string; body?: unknown; authorization?: string }[] = []
let publicationStatus = "succeeded"
let settingsEnvironment: unknown = {
  r2Prefix: "production",
  publicBaseUrl: "https://assets.example",
}
let catalogOutputs: unknown[] = [
  { assetId: "asset-1", class: "image", key: "detail", path: "images/detail.avif" },
  { assetId: "asset-1", class: "image", key: "card", path: "images/card.avif" },
  { assetId: "asset-1", class: "image", key: "organizer", path: "images/organizer.avif" },
]

function serviceFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input))
  const method = init?.method ?? "GET"
  if (url.hostname === "storage.example") {
    calls.push({ path: url.pathname, method })
    return Promise.resolve(new Response(null, { status: 200 }))
  }
  calls.push({
    path: url.pathname,
    method,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    authorization: new Headers(init?.headers).get("authorization") ?? undefined,
  })
  let data: unknown
  if (url.pathname.endsWith("/settings")) data = { environment: settingsEnvironment }
  else if (url.pathname.endsWith("/uploads/intent"))
    data = {
      uploadId: "upload-1",
      intent: {
        method: "PUT",
        url: "https://storage.example/upload",
        headers: {},
        byteSize: 3,
        mediaType: "image/png",
      },
    }
  else if (url.pathname.endsWith("/complete")) data = { assetId: "asset-1", workflowId: "ingest" }
  else if (url.pathname.endsWith("/workflows/ingest/status")) data = { status: "succeeded" }
  else if (url.pathname.endsWith("/workflows/variants/status")) data = { status: publicationStatus }
  else if (url.pathname.endsWith("/assets/asset-1/outputs")) data = { workflowId: "variants" }
  else if (url.pathname.endsWith("/catalogs/current")) data = { catalog: { outputs: catalogOutputs } }
  else throw new Error("unexpected service request")
  return Promise.resolve(Response.json({ ok: true, data }))
}

function configSet() {
  vi.stubEnv("ASSETS_SERVICE_API_URL", "https://api.example")
  vi.stubEnv("ASSETS_SERVICE_PROJECT_ID", "project-1")
  vi.stubEnv("ASSETS_SERVICE_ACCESS_TOKEN", "private-token")
  vi.stubGlobal("fetch", serviceFetch)
}

afterEach(() => {
  calls.length = 0
  publicationStatus = "succeeded"
  settingsEnvironment = {
    r2Prefix: "production",
    publicBaseUrl: "https://assets.example",
  }
  catalogOutputs = [
    { assetId: "asset-1", class: "image", key: "detail", path: "images/detail.avif" },
    { assetId: "asset-1", class: "image", key: "card", path: "images/card.avif" },
    { assetId: "asset-1", class: "image", key: "organizer", path: "images/organizer.avif" },
  ]
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

test("sends strict single-binding intent, waits for both workflows, returns canonical binding URLs", async () => {
  configSet()
  const result = await catalogImageForward({
    filename: "event.png",
    mediaType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
    stageId: "stage-1",
  })
  expect(result).toEqual({
    success: true,
    data: {
      assetId: "asset-1",
      detail: "https://assets.example/production/public/images/detail.avif",
      card: "https://assets.example/production/public/images/card.avif",
      organizer: "https://assets.example/production/public/images/organizer.avif",
    },
  })
  const intentBody = calls.find((call) => call.path.endsWith("/uploads/intent"))?.body as Record<string, unknown>
  expect(intentBody).toMatchObject({
    originalFilename: "event-stage-1.png",
    folders: ["events"],
    sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  })
  expect(intentBody).not.toHaveProperty("environment")
  expect(calls.find((call) => call.path === "/upload")?.authorization).toBeUndefined()
  expect(calls.find((call) => call.path.endsWith("/assets/asset-1/outputs"))?.body).toEqual({
    outputs: [
      { kind: "image", key: "detail", width: 1920, height: 820, format: "avif", quality: 80 },
      { kind: "image", key: "card", width: 1200, height: 900, format: "avif", quality: 80 },
      { kind: "image", key: "organizer", width: 1920, height: 1080, format: "avif", quality: 80 },
    ],
  })
  expect(calls.find((call) => call.path.endsWith("/catalogs/current"))).toBeTruthy()
  expect(calls.some((call) => call.path.includes("/environments/"))).toBe(false)
  expect(calls.some((call) => call.path.includes("/catalogs/production/"))).toBe(false)
  expect(calls.some((call) => call.path.includes("/reprocess"))).toBe(false)
})

test("fails instead of fabricating a URL if a published variant is absent", async () => {
  configSet()
  catalogOutputs = []
  const result = await catalogImageForward({
    filename: "event.png",
    mediaType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
    stageId: "stage-2",
  })
  expect(result.success).toBe(false)
})

test("does not read catalog when publication fails", async () => {
  configSet()
  publicationStatus = "failed"
  const result = await catalogImageForward({
    filename: "event.png",
    mediaType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
    stageId: "stage-3",
  })
  expect(result.success).toBe(false)
  expect(calls.some((call) => call.path.endsWith("/catalogs/current"))).toBe(false)
})

test("fails closed without uploading when the single binding is missing", async () => {
  configSet()
  settingsEnvironment = null
  const result = await catalogImageForward({
    filename: "event.png",
    mediaType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
    stageId: "stage-4",
  })
  expect(result).toEqual({ success: false, op: "catalogImageForward", errorMessage: expect.any(String) })
  expect(calls.some((call) => call.path.endsWith("/uploads/intent"))).toBe(false)
})
