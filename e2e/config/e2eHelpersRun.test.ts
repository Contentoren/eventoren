import { describe, expect, it } from "@rstest/core"
import { e2eHelpersRun } from "./e2eHelpersRun.ts"

describe("direct E2E helper invocation", () => {
  it("sweeps traces after helper failures and preserves their exit status", async () => {
    let swept = false
    const status = await e2eHelpersRun({
      commandRun: async () => 7,
      traceCleanup: async () => {
        swept = true
        return { success: true, removed: [] }
      },
    })
    expect(status).toBe(7)
    expect(swept).toBe(true)
  })

  it("sweeps traces when the helper process cannot start", async () => {
    let swept = false
    const status = await e2eHelpersRun({
      commandRun: async () => {
        throw new Error("spawn failed")
      },
      traceCleanup: async () => {
        swept = true
        return { success: true, removed: [] }
      },
    })
    expect(status).toBe(1)
    expect(swept).toBe(true)
  })

  it("reports cleanup failures while preserving an existing helper failure code", async () => {
    const errors: unknown[][] = []
    const original = console.error
    console.error = (...args: unknown[]) => {
      errors.push(args)
    }
    try {
      expect(
        await e2eHelpersRun({
          commandRun: async () => 7,
          traceCleanup: async () => ({ success: false, errorMessage: "permission denied" }),
        }),
      ).toBe(7)
      expect(errors).toEqual([["Playwright trace cleanup failed: permission denied"]])
    } finally {
      console.error = original
    }
  })
})
