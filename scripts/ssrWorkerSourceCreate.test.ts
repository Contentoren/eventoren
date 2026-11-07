import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { ssrWorkerSourceCreate } from "./ssrWorkerSourceCreate.ts"

type WorkerServerState = {
  status: number
  statusText: string
  body: string
  bodyChunks: string[] | null
  headers: Record<string, string>
  setCookies: string[]
  immutableHeaders: boolean
  lastResponse: Response | null
  requests: string[]
}

type WorkerModule = {
  default: {
    fetch: (request: Request, env: unknown) => Promise<Response>
  }
}

type WorkerEnvOptions = {
  assetsStatus?: number
  assetsBody?: string
  assetsHeaders?: Record<string, string>
  assetsSetCookies?: string[]
}

const workerDirectory = mkdtempSync(join(tmpdir(), "eventoren-ssr-worker-"))
const workerClientDirectory = join(workerDirectory, "client")
const workerServerDirectory = join(workerDirectory, "server")
const workerFilePath = join(workerClientDirectory, "_worker.js")
const workerServerFilePath = join(workerServerDirectory, "server.js")

// Mirrors the runtime shapes the worker has to survive: streamed bodies,
// cache headers, several Set-Cookie headers and immutable header lists.
const workerServerSource = `
export const state = {
  status: 200,
  statusText: "",
  body: "ssr",
  bodyChunks: null,
  headers: {},
  setCookies: [],
  immutableHeaders: false,
  lastResponse: null,
  requests: [],
}


function headersImmutableApply(response) {
  const headers = response.headers
  const proxy = new Proxy(headers, {
    get(target, property) {
      if (property === "set" || property === "append" || property === "delete") {
        return () => {
          throw new TypeError("Headers are immutable")
        }
      }
      const value = Reflect.get(target, property, target)
      return typeof value === "function" ? value.bind(target) : value
    },
  })
  Object.defineProperty(response, "headers", { configurable: true, get: () => proxy })
  return response
}


function bodyCreate() {
  if (state.bodyChunks === null) return state.body
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of state.bodyChunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
}


export default {
  async fetch(request) {
    state.requests.push(request.url)
    const headers = new Headers(state.headers)
    for (const cookie of state.setCookies) headers.append("set-cookie", cookie)
    const response = new Response(bodyCreate(), { status: state.status, statusText: state.statusText, headers })
    state.lastResponse = state.immutableHeaders ? headersImmutableApply(response) : response
    return state.lastResponse
  },
}
`

const canonicalProductionHostname = "eventoren.de"
const noncanonicalHostnames = [
  "preview.eventoren.pages.dev",
  "eventoren.pages.dev",
  "1a2b3c4d5e6f.eventoren.pages.dev",
  "eventoren.contentoren.de",
]

let workerModule: WorkerModule
let workerServerState: WorkerServerState

beforeAll(async () => {
  mkdirSync(workerClientDirectory, { recursive: true })
  mkdirSync(workerServerDirectory, { recursive: true })
  writeFileSync(join(workerDirectory, "package.json"), JSON.stringify({ type: "module" }))
  writeFileSync(workerFilePath, ssrWorkerSourceCreate({ convexUrl: "http://127.0.0.1:3210" }))
  writeFileSync(workerServerFilePath, workerServerSource)
  workerModule = (await import(pathToFileURL(workerFilePath).href)) as WorkerModule
  workerServerState = (await import(pathToFileURL(workerServerFilePath).href)).state as WorkerServerState
})

beforeEach(() => {
  workerServerState.status = 200
  workerServerState.statusText = ""
  workerServerState.body = "ssr"
  workerServerState.bodyChunks = null
  workerServerState.headers = {}
  workerServerState.setCookies = []
  workerServerState.immutableHeaders = false
  workerServerState.lastResponse = null
  workerServerState.requests = []
})

afterAll(() => {
  rmSync(workerDirectory, { recursive: true, force: true })
})

function workerEnvCreate(options: WorkerEnvOptions = {}): { env: unknown; assetsRequests: string[] } {
  const assetsRequests: string[] = []
  const assetsHeaders = new Headers(options.assetsHeaders ?? {})
  for (const cookie of options.assetsSetCookies ?? []) assetsHeaders.append("set-cookie", cookie)
  return {
    assetsRequests,
    env: {
      ASSETS: {
        fetch: async (request: Request) => {
          assetsRequests.push(request.url)
          return new Response(options.assetsBody ?? "asset", {
            status: options.assetsStatus ?? 404,
            headers: assetsHeaders,
          })
        },
      },
    },
  }
}

function setCookieValues(response: Response): string[] {
  if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie()
  const combined = response.headers.get("set-cookie")
  return combined === null ? [] : [combined]
}

test("ssrWorkerSourceCreate redirects both legacy datenschutzerklaerung paths to the canonical /datenschutz permanently", async () => {
  for (const pathname of ["/datenschutzerklaerung", "/datenschutzerklaerung/"]) {
    const response = await workerModule.default.fetch(
      new Request(`https://eventoren.de${pathname}`),
      workerEnvCreate().env,
    )
    expect(response.status, pathname).toBe(301)
    expect(response.headers.get("location"), pathname).toBe("https://eventoren.de/datenschutz")
  }
})

test("ssrWorkerSourceCreate redirects the legacy /impressum/ path to the canonical /impressum permanently", async () => {
  const response = await workerModule.default.fetch(
    new Request("https://eventoren.de/impressum/"),
    workerEnvCreate().env,
  )
  expect(response.status).toBe(301)
  expect(response.headers.get("location")).toBe("https://eventoren.de/impressum")
})

test("ssrWorkerSourceCreate preserves the request query string on legacy redirects", async () => {
  const response = await workerModule.default.fetch(
    new Request("https://eventoren.de/datenschutzerklaerung/?utm_source=legacy"),
    workerEnvCreate().env,
  )
  expect(response.status).toBe(301)
  expect(response.headers.get("location")).toBe("https://eventoren.de/datenschutz?utm_source=legacy")
})

test("ssrWorkerSourceCreate sends www legacy paths straight to the apex canonical target without a redirect chain", async () => {
  const response = await workerModule.default.fetch(
    new Request("https://www.eventoren.de/datenschutzerklaerung/"),
    workerEnvCreate().env,
  )
  expect(response.status).toBe(301)
  expect(response.headers.get("location")).toBe("https://eventoren.de/datenschutz")
})

test("ssrWorkerSourceCreate keeps the existing www to apex permanent redirect for other paths", async () => {
  const response = await workerModule.default.fetch(
    new Request("https://www.eventoren.de/kontakt?param=1"),
    workerEnvCreate().env,
  )
  expect(response.status).toBe(301)
  expect(response.headers.get("location")).toBe("https://eventoren.de/kontakt?param=1")
})

test("ssrWorkerSourceCreate serves the canonical redirect targets without a redirect loop", async () => {
  for (const pathname of ["/datenschutz", "/impressum"]) {
    const response = await workerModule.default.fetch(
      new Request(`https://eventoren.de${pathname}`),
      workerEnvCreate().env,
    )
    expect(response.status, pathname).toBe(200)
    expect(response.headers.get("location"), pathname).toBeNull()
  }
})

test("ssrWorkerSourceCreate leaves unrelated expired product paths on the 404 fallback without a redirect", async () => {
  const { env, assetsRequests } = workerEnvCreate({ assetsStatus: 404 })
  workerServerState.status = 404
  const response = await workerModule.default.fetch(
    new Request("https://eventoren.de/produkt/volleyball-turnier-2"),
    env,
  )
  expect(response.status).toBe(404)
  expect(response.headers.get("location")).toBeNull()
  expect(assetsRequests).toEqual(["https://eventoren.de/produkt/volleyball-turnier-2"])
})

test("ssrWorkerSourceCreate keeps the homepage and unknown paths free of catch-all redirects", async () => {
  const homepage = await workerModule.default.fetch(new Request("https://eventoren.de/"), workerEnvCreate().env)
  expect(homepage.status).toBe(200)
  expect(homepage.headers.get("location")).toBeNull()

  const unknown = await workerModule.default.fetch(
    new Request("https://eventoren.de/gibtsnicht"),
    workerEnvCreate().env,
  )
  expect(unknown.status).toBe(200)
  expect(unknown.headers.get("location")).toBeNull()
})

test("ssrWorkerSourceCreate leaves canonical production responses indexable", async () => {
  const response = await workerModule.default.fetch(
    new Request(`https://${canonicalProductionHostname}/`),
    workerEnvCreate().env,
  )
  expect(response.status).toBe(200)
  expect(response.headers.get("x-robots-tag")).toBeNull()
})

test("ssrWorkerSourceCreate keeps the canonical www redirect unchanged and free of a noindex header", async () => {
  const response = await workerModule.default.fetch(
    new Request("https://www.eventoren.de/kontakt"),
    workerEnvCreate().env,
  )
  expect(response.status).toBe(301)
  expect(response.headers.get("location")).toBe("https://eventoren.de/kontakt")
  expect(response.headers.get("x-robots-tag")).toBeNull()
})

test("ssrWorkerSourceCreate marks server rendered responses on noncanonical hosts as noindex", async () => {
  for (const hostname of noncanonicalHostnames) {
    const response = await workerModule.default.fetch(new Request(`https://${hostname}/`), workerEnvCreate().env)
    expect(response.status, hostname).toBe(200)
    expect(response.headers.get("x-robots-tag"), hostname).toBe("noindex")
  }
})

test("ssrWorkerSourceCreate marks the assets fallback response on noncanonical hosts as noindex", async () => {
  const { env, assetsRequests } = workerEnvCreate({ assetsStatus: 404 })
  workerServerState.status = 404
  const response = await workerModule.default.fetch(
    new Request("https://preview.eventoren.pages.dev/assets/fehlend.js"),
    env,
  )
  expect(response.status).toBe(404)
  expect(response.headers.get("x-robots-tag")).toBe("noindex")
  expect(assetsRequests).toEqual(["https://preview.eventoren.pages.dev/assets/fehlend.js"])
})

test("ssrWorkerSourceCreate marks the ai catalog fastpath response on noncanonical hosts as noindex", async () => {
  const { env, assetsRequests } = workerEnvCreate({ assetsStatus: 200, assetsBody: "{}" })
  const response = await workerModule.default.fetch(
    new Request("https://preview.eventoren.pages.dev/.well-known/ai-catalog.json"),
    env,
  )
  expect(response.status).toBe(200)
  expect(response.headers.get("x-robots-tag")).toBe("noindex")
  expect(await response.text()).toBe("{}")
  expect(assetsRequests).toEqual(["https://preview.eventoren.pages.dev/.well-known/ai-catalog.json"])
  expect(workerServerState.requests).toEqual([])
})

test("ssrWorkerSourceCreate keeps body, status, cache and cookie headers unchanged while adding the noindex header", async () => {
  workerServerState.status = 206
  workerServerState.statusText = "Partial Content"
  workerServerState.bodyChunks = ["chunk-one ", "chunk-two"]
  workerServerState.headers = { "cache-control": "public, max-age=60", "content-type": "text/html; charset=utf-8" }
  workerServerState.setCookies = ["session=abc; Path=/; HttpOnly", "locale=de; Path=/"]
  workerServerState.immutableHeaders = true

  const response = await workerModule.default.fetch(
    new Request("https://preview.eventoren.pages.dev/events/abiball-36a4910d"),
    workerEnvCreate().env,
  )

  expect(response.status).toBe(206)
  expect(response.statusText).toBe("Partial Content")
  expect(await response.text()).toBe("chunk-one chunk-two")
  expect(response.headers.get("cache-control")).toBe("public, max-age=60")
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
  expect(response.headers.get("x-robots-tag")).toBe("noindex")
  expect(setCookieValues(response)).toEqual(["session=abc; Path=/; HttpOnly", "locale=de; Path=/"])

  const sourceResponse = workerServerState.lastResponse
  expect(sourceResponse).not.toBeNull()
  expect(sourceResponse?.headers.get("x-robots-tag")).toBeNull()
  expect(setCookieValues(sourceResponse as Response)).toEqual(["session=abc; Path=/; HttpOnly", "locale=de; Path=/"])
})

test("ssrWorkerSourceCreate serves prerendered Ratgeber and Guides pages from the static assets without SSR", async () => {
  for (const pathname of ["/ratgeber", "/ratgeber/tickets-online-verkaufen", "/en/guides", "/en/guides/fake-tickets"]) {
    workerServerState.requests = []
    const { env, assetsRequests } = workerEnvCreate({ assetsStatus: 200, assetsBody: "static" })
    const response = await workerModule.default.fetch(new Request(`https://eventoren.de${pathname}`), env)
    expect(response.status, pathname).toBe(200)
    expect(await response.text(), pathname).toBe("static")
    expect(response.headers.get("x-robots-tag"), pathname).toBeNull()
    expect(assetsRequests, pathname).toEqual([`https://eventoren.de${pathname}`])
    expect(workerServerState.requests, pathname).toEqual([])
  }
})

test("ssrWorkerSourceCreate falls back to SSR when a Ratgeber page has no static asset or the asset redirects", async () => {
  for (const assetsStatus of [404, 308]) {
    workerServerState.requests = []
    const { env } = workerEnvCreate({ assetsStatus, assetsBody: "asset" })
    const response = await workerModule.default.fetch(new Request("https://eventoren.de/ratgeber/neu"), env)
    expect(response.status, String(assetsStatus)).toBe(200)
    expect(await response.text(), String(assetsStatus)).toBe("ssr")
    expect(workerServerState.requests, String(assetsStatus)).toEqual(["https://eventoren.de/ratgeber/neu"])
  }
})

test("ssrWorkerSourceCreate marks static Ratgeber pages on noncanonical hosts as noindex", async () => {
  const { env } = workerEnvCreate({ assetsStatus: 200, assetsBody: "static" })
  const response = await workerModule.default.fetch(new Request("https://preview.eventoren.pages.dev/ratgeber"), env)
  expect(response.status).toBe(200)
  expect(response.headers.get("x-robots-tag")).toBe("noindex")
})

test("ssrWorkerSourceCreate does not try static assets first for paths that only share the Ratgeber prefix", async () => {
  const { env, assetsRequests } = workerEnvCreate({ assetsStatus: 200, assetsBody: "static" })
  const response = await workerModule.default.fetch(new Request("https://eventoren.de/ratgeber-alt"), env)
  expect(await response.text()).toBe("ssr")
  expect(assetsRequests).toEqual([])
})
