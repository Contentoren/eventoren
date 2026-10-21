import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
const flag = "EVENTOREN_FINANZEN_STATE_CASES"
if (process.env[flag] === "1") {
  await import("./veranstalterDashboardFinanzenPageStateCreate.case.ts")
} else {
  test("finanzen gating, event scoping and payout recording pass in an isolated Solid runtime", () => {
    const result = Bun.spawnSync([process.execPath, "test", fileURLToPath(import.meta.url)], {
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", [flag]: "1" },
      timeout: 30000,
    })
    const output = result.stdout.toString() + result.stderr.toString()
    expect(result.exitCode, output).toBe(0)
    expect(output).toMatch(/\b4 pass\b/)
  })
}
