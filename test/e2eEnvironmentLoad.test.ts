import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { e2eEnvironmentLoad } from "../e2e/config/e2eEnvironmentLoad.ts"

describe("E2E optional environment file", () => {
  test("loads an optional file without overriding variables supplied by the caller", () => {
    const directory = mkdtempSync(join(tmpdir(), "eventoren-e2e-env-"))
    const envFilePath = join(directory, ".env.e2e.local")
    const fileValueName = "E2E_CONFIG_TEST_FILE_VALUE"
    const callerValueName = "E2E_CONFIG_TEST_CALLER_VALUE"
    const originalFileValue = process.env[fileValueName]
    const originalCallerValue = process.env[callerValueName]

    try {
      writeFileSync(envFilePath, `${fileValueName}=loaded\n${callerValueName}=file-value\n`)
      process.env[callerValueName] = "caller-value"

      e2eEnvironmentLoad(envFilePath)

      expect(process.env[fileValueName]).toBe("loaded")
      expect(process.env[callerValueName]).toBe("caller-value")
      expect(() => e2eEnvironmentLoad(join(directory, "missing.env"))).not.toThrow()
    } finally {
      if (originalFileValue === undefined) delete process.env[fileValueName]
      else process.env[fileValueName] = originalFileValue

      if (originalCallerValue === undefined) delete process.env[callerValueName]
      else process.env[callerValueName] = originalCallerValue

      rmSync(directory, { recursive: true, force: true })
    }
  })
})
