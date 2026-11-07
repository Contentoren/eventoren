import { defineConfig } from "@rstest/core"
import { definePlaywrightConfig } from "@rstest/playwright/config"
import { e2eEnvironmentLoad } from "./config/e2eEnvironmentLoad.ts"
import { e2eEnvironmentRead } from "./config/e2eEnvironmentRead.ts"

e2eEnvironmentLoad()

// Public content pages need no credentials, Convex or Stripe, so they run outside the
// checkpointed invocation. The canonical target origin becomes Playwright's baseURL;
// specs navigate by path only and never hardcode a host.
const environment = e2eEnvironmentRead(process.env)
if (!environment.success) throw new Error(environment.errorMessage)
const baseURL = environment.data.baseUrl

export default defineConfig({
  extends: definePlaywrightConfig({ contextOptions: { baseURL }, requestOptions: { baseURL } }),
  include: ["e2e/workflows/content/*.test.ts"],
  testEnvironment: "node",
  isolate: false,
})
