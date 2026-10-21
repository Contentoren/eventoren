import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

// Exercise the real Solid/provider adapters without other suites' global mocks.
const caseFlag = "EVENTOREN_EVENT_DETAIL_SCOPE_CASES"
if (process.env[caseFlag] === "1") {
  await import("./veranstalterDashboardEventDetailScope.case.ts")
} else {
  test("event detail scope regressions pass through the real providers in an isolated runtime", () => {
    const result = Bun.spawnSync([process.execPath, "test", fileURLToPath(import.meta.url)], {
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", [caseFlag]: "1" },
      timeout: 30_000,
    })
    const output = result.stdout.toString() + result.stderr.toString()
    expect(result.exitCode, output).toBe(0)
    expect(output).toMatch(/\b51 pass\b/)
  })
}
