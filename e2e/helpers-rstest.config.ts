import { defineConfig } from "@rstest/core"

export default defineConfig({
  include: ["e2e/mail/*.test.ts", "e2e/pdf/*.test.ts"],
  testEnvironment: "node",
})
