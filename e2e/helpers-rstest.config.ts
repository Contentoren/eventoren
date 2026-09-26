import { defineConfig } from "@rstest/core"

export default defineConfig({
  include: ["e2e/mail/*.test.ts", "e2e/pdf/*.test.ts", "e2e/config/*.test.ts", "e2e/checkpoint/*.test.ts"],
  testEnvironment: "node",
})
