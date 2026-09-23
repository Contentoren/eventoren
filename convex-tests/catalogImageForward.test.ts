import { afterEach, expect, test, vi } from "vitest"
import { catalogImageForward } from "../src/catalog/convex/catalogImageForward.ts"

const calls: { path: string; method: string; body?: unknown; authorization?: string }[] = []
let publicationStatus = "succeeded"
let defaultEnvironment = "production"
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
  if (url.pathname === "/api/v1/projects/project-1") data = { defaultEnvironment }
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
  else if (url.pathname.endsWith("/workflows/target/status")) data = { status: "succeeded" }
  else if (url.pathname.endsWith("/assets/asset-1/outputs")) data = { workflowId: "variants" }
  else if (url.pathname.endsWith("/assets/asset-1/reprocess")) data = { workflowId: "target" }
  else if (url.pathname.endsWith("/current")) data = { catalog: { outputs: catalogOutputs } }
  else if (url.pathname.endsWith("/environments/production") || url.pathname.endsWith("/environments/development"))
    data = { id: "environment-1", publicBaseUrl: "https://assets.example/" }
  else throw new Error("unexpected service request")
  return Promise.resolve(Response.json({ ok: true, data }))
}

function configSet() {
  vi.stubEnv("ASSETS_SERVICE_API_URL", "https://api.example")
  vi.stubEnv("ASSETS_SERVICE_PROJECT_ID", "project-1")
  vi.stubEnv("ASSETS_SERVICE_ENVIRONMENT", "production")
  vi.stubEnv("ASSETS_SERVICE_ACCESS_TOKEN", "private-token")
  vi.stubGlobal("fetch", serviceFetch)
}

afterEach(() => {
  calls.length = 0
  publicationStatus = "succeeded"
  defaultEnvironment = "production"
  catalogOutputs = [
    { assetId: "asset-1", class: "image", key: "detail", path: "images/detail.avif" },
    { assetId: "asset-1", class: "image", key: "card", path: "images/card.avif" },
    { assetId: "asset-1", class: "image", key: "organizer", path: "images/organizer.avif" },
  ]
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

test("sends signed PUT without bearer token, waits for both workflows, returns only published catalog URLs", async () => {
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
      detail: "https://assets.example/images/detail.avif",
      card: "https://assets.example/images/card.avif",
      organizer: "https://assets.example/images/organizer.avif",
    },
  })
  expect(calls.find((call) => call.path.endsWith("/uploads/intent"))?.body).toMatchObject({
    originalFilename: "event-stage-1.png",
    folders: ["events"],
    environment: "production",
    sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  })
  expect(calls.find((call) => call.path === "/upload")?.authorization).toBeUndefined()
  expect(calls.find((call) => call.path.endsWith("/assets/asset-1/outputs"))?.body).toEqual({
    outputs: [
      { kind: "image", key: "detail", width: 1920, height: 820, format: "avif", quality: 80 },
      { kind: "image", key: "card", width: 1200, height: 900, format: "avif", quality: 80 },
      { kind: "image", key: "organizer", width: 1920, height: 1080, format: "avif", quality: 80 },
    ],
  })
  expect(calls.find((call) => call.path.endsWith("/current"))).toBeTruthy()
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
  expect(calls.some((call) => call.path.endsWith("/current"))).toBe(false)
})

test("reprocesses and publishes into the target environment when the project default differs", async () => {
  configSet()
  defaultEnvironment = "development"
  const result = await catalogImageForward({
    filename: "event.png",
    mediaType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
    stageId: "stage-4",
  })
  expect(result.success).toBe(true)
  expect(calls.find((call) => call.path.endsWith("/assets/asset-1/reprocess"))?.body).toEqual({
    environmentId: "environment-1",
  })
  expect(calls.some((call) => call.path.endsWith("/workflows/target/status"))).toBe(true)
})
