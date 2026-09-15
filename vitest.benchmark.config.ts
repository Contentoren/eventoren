import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["benchmarks/**/*.bench.ts"],
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
})
