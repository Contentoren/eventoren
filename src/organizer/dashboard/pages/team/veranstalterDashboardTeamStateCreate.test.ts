import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

// Isolate the real Solid/provider adapters from legacy global module mocks.
const caseFlag = "EVENTOREN_TEAM_STATE_CASES"
if (process.env[caseFlag] === "1") {
  await import("./veranstalterDashboardTeamStateCreate.case.ts")
} else {
  test("team scope and URL-dialog regressions pass through real providers in an isolated runtime", () => {
    const result = Bun.spawnSync([process.execPath, "test", fileURLToPath(import.meta.url)], {
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", [caseFlag]: "1" },
      timeout: 30_000,
    })
    const output = result.stdout.toString() + result.stderr.toString()
    expect(result.exitCode, output).toBe(0)
    expect(output).toMatch(/\b16 pass\b/)
  })
}
