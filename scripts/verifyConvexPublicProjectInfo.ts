import { apiClientCreate, apiClientPublicProjectInfoGet } from "../src/index.js"

const convexUrl =
  process.env.CONVEX_URL ??
  process.env.VITE_CONVEX_URL ??
  process.env.PUBLIC_BASE_URL_CONVEX ??
  process.env.CONVEX_SELF_HOSTED_URL ??
  "http://127.0.0.1:3210"
const result = await apiClientPublicProjectInfoGet(apiClientCreate(convexUrl))
if (!result.success) {
  console.error(result.error.message)
  process.exitCode = 1
} else if (result.data.projectName.length === 0 || !Number.isFinite(result.data.serverTimestamp)) {
  console.error("Convex public project info is malformed")
  process.exitCode = 1
} else {
  console.log(JSON.stringify(result.data))
}
