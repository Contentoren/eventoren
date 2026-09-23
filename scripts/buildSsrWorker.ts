import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const workerPath = resolve("dist/client/_worker.js")
const buildConvexUrl =
  process.env.PUBLIC_BASE_URL_CONVEX ??
  process.env.VITE_CONVEX_URL ??
  process.env.CONVEX_URL ??
  process.env.CONVEX_SELF_HOSTED_URL ??
  "http://127.0.0.1:3210"
await mkdir(dirname(workerPath), { recursive: true })
await writeFile(
  workerPath,
  `import server from "../server/server.js"


function runtimeEnvironmentApply(env) {
  if (typeof process === "undefined") return
  process.env ??= {}
  for (const [key, value] of Object.entries(env ?? {})) {
    if (typeof value === "string") process.env[key] = value
  }
}


function convexUrlResolve(env) {
  return [
    env?.CONVEX_URL,
    env?.PUBLIC_BASE_URL_CONVEX,
    env?.VITE_CONVEX_URL,
    env?.CONVEX_SELF_HOSTED_URL,
    ${JSON.stringify(buildConvexUrl)},
  ].find((value) => typeof value === "string" && value.length > 0)
}


export default {
  async fetch(request, env) {
    runtimeEnvironmentApply(env)
    const requestUrl = new URL(request.url)
    if (requestUrl.hostname === "www.eventoren.de") {
      requestUrl.protocol = "https:"
      requestUrl.hostname = "eventoren.de"
      requestUrl.port = ""
      return new Response(null, { status: 301, headers: { location: requestUrl.toString() } })
    }

    const response = await server.fetch(request, { context: { convexUrl: convexUrlResolve(env) } })
    if (response.status !== 404) return response
    return env.ASSETS.fetch(request)
  },
}
`,
)
await writeFile(resolve("dist/client/.assetsignore"), "_worker.js\n")
