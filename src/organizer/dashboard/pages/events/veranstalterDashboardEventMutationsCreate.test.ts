import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

// Other legacy tests replace Solid modules globally. Run these real-provider
// cases in a fresh runtime, without changing the app's mutation factory.
const caseFlag = "EVENTOREN_EVENT_MUTATION_CONTEXT_CASES"

if (process.env[caseFlag] === "1") {
  await import("./veranstalterDashboardEventMutationsCreate.case.ts")
} else {
  test("event mutation setup captures real provider contexts and preserves live auth in an isolated runtime", () => {
    const result = Bun.spawnSync([process.execPath, "test", fileURLToPath(import.meta.url)], {
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        [caseFlag]: "1",
      },
      timeout: 30_000,
    })
    const output = result.stdout.toString() + result.stderr.toString()
    expect(result.exitCode, output).toBe(0)
    expect(output).toMatch(/\b3 pass\b/)
  })
}
