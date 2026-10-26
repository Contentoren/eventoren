import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { ssrWorkerSourceCreate } from "./ssrWorkerSourceCreate.ts"

const workerPath = resolve("dist/client/_worker.js")
const buildConvexUrl =
  process.env.PUBLIC_BASE_URL_CONVEX ??
  process.env.VITE_CONVEX_URL ??
  process.env.CONVEX_URL ??
  process.env.CONVEX_SELF_HOSTED_URL ??
  "http://127.0.0.1:3210"
await mkdir(dirname(workerPath), { recursive: true })
await writeFile(workerPath, ssrWorkerSourceCreate({ convexUrl: buildConvexUrl }))
await writeFile(resolve("dist/client/.assetsignore"), "_worker.js\n")
