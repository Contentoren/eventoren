import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

const flag = "EVENTOREN_REACTIVITY_FIXES_CASES"
if (process.env[flag] === "1") {
  await import("./veranstalterReactivityFixes.case.ts")
} else {
  test("reactivity fixes hold with real providers in an isolated runtime", () => {
    const result = Bun.spawnSync([process.execPath, "test", fileURLToPath(import.meta.url)], {
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", [flag]: "1" },
      timeout: 30_000,
    })
    const output = result.stdout.toString() + result.stderr.toString()
    expect(result.exitCode, output).toBe(0)
    expect(output).toMatch(/\b8 pass\b/)
  })
}
