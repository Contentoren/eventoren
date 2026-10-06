import { defineConfig } from "@rstest/core"

export default defineConfig({
  include: [
    "e2e/mail/*.test.ts",
    "e2e/pdf/*.test.ts",
    "e2e/config/*.test.ts",
    "e2e/checkpoint/*.test.ts",
    "e2e/catalog/*.test.ts",
    "e2e/stripe/*.test.ts",
    "e2e/workflows/eventorenE2eReturnUrlMatches.test.ts",
    "e2e/workflows/ticketPurchase/ticketPurchaseStepRun.test.ts",
  ],
  testEnvironment: "node",
})
