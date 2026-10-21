import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

// Keep the real Solid/provider runtime isolated from legacy global module mocks.
const caseFlag = "EVENTOREN_SETTINGS_STATE_CASES"

if (process.env[caseFlag] === "1") {
  await import("./veranstalterEinstellungenPageStateCreate.case.ts")
} else {
  test("settings state organization reactivity and mutation guards work in an isolated runtime", () => {
    const result = Bun.spawnSync([process.execPath, "test", fileURLToPath(import.meta.url)], {
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", [caseFlag]: "1" },
      timeout: 30_000,
    })
    const output = result.stdout.toString() + result.stderr.toString()
    expect(result.exitCode, output).toBe(0)
    expect(output).toMatch(/\b19 pass\b/)
  })
}
