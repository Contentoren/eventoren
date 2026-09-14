import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const workerPath = resolve("dist/client/_worker.js")
await mkdir(dirname(workerPath), { recursive: true })
await writeFile(
  workerPath,
  'import server from "../server/server.js"\n\n\nfunction convexUrlResolve(env) {\n  return [\n    env?.CONVEX_URL,\n    env?.PUBLIC_BASE_URL_CONVEX,\n    env?.VITE_CONVEX_URL,\n    env?.CONVEX_SELF_HOSTED_URL,\n  ].find((value) => typeof value === "string" && value.length > 0)\n}\n\n\nexport default {\n  async fetch(request, env) {\n    const requestUrl = new URL(request.url)\n    if (requestUrl.hostname === "www.eventoren.contentoren.de") {\n      requestUrl.protocol = "https:"\n      requestUrl.hostname = "eventoren.contentoren.de"\n      requestUrl.port = ""\n      return new Response(null, { status: 301, headers: { location: requestUrl.toString() } })\n    }\n\n    const response = await server.fetch(request, { context: { convexUrl: convexUrlResolve(env) } })\n    if (response.status !== 404) return response\n    return env.ASSETS.fetch(request)\n  },\n}\n',
)
await writeFile(resolve("dist/client/.assetsignore"), "_worker.js\n")
