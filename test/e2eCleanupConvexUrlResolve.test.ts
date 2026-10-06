import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { e2eCleanupConvexUrlResolve } from "../e2e/config/e2eCleanupConvexUrlResolve.ts"

describe("E2E cleanup Convex URL resolution", () => {
  test("prefers the explicit override, otherwise reads only the selected target backend URL", () => {
    const directory = mkdtempSync(join(tmpdir(), "eventoren-e2e-convex-"))
    try {
      const productionEnvironmentPath = join(directory, ".env.production")
      const developmentEnvironmentPath = join(directory, ".env.development")
      writeFileSync(
        productionEnvironmentPath,
        "VITE_CONVEX_URL=https://production-convex.example\nPUBLIC_BASE_URL_CONVEX=https://production-public.example\nSTRIPE_SECRET=not-loaded\n",
      )
      writeFileSync(developmentEnvironmentPath, "PUBLIC_BASE_URL_CONVEX=https://development-convex.example\n")

      expect(
        e2eCleanupConvexUrlResolve(
          { E2E_CLEANUP_CONVEX_URL: " https://override.example " },
          "production",
          productionEnvironmentPath,
        ),
      ).toBe("https://override.example")
      expect(e2eCleanupConvexUrlResolve({}, "production", productionEnvironmentPath)).toBe(
        "https://production-convex.example",
      )
      expect(e2eCleanupConvexUrlResolve({}, "development", developmentEnvironmentPath)).toBe(
        "https://development-convex.example",
      )
      expect(process.env.STRIPE_SECRET).toBeUndefined()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
