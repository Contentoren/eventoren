import { defineConfig } from "@rstest/core"
import { definePlaywrightConfig } from "@rstest/playwright/config"
import { e2eEnvironmentLoad } from "./config/e2eEnvironmentLoad.ts"

e2eEnvironmentLoad()

export default defineConfig({
  extends: definePlaywrightConfig({}),
  include: ["e2e/workflows/sso.test.ts"],
  testEnvironment: "node",
  isolate: false,
})
