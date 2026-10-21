import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

const helperPath = fileURLToPath(new URL("../ops/convex/local-rehearsal/log-count.bash", import.meta.url))

test("zero cron or scheduler log matches do not fail a healthy rehearsal under pipefail", () => {
  const result = Bun.spawnSync([
    "bash",
    "-o",
    "pipefail",
    "-c",
    'printf \'%s\' "$1" | bash "$2"',
    "count-test",
    "backend healthy\n",
    helperPath,
  ])
  expect(result.exitCode).toBe(0)
  expect(result.stdout.toString()).toBe("0\n")
})

test("log counting outputs numbers only and retains upstream errors", () => {
  const result = Bun.spawnSync([
    "bash",
    "-o",
    "pipefail",
    "-c",
    'printf \'%s\' "$1" | bash "$2"',
    "count-test",
    "CRON started\nprivate-log-content\nscheduled work\n",
    helperPath,
  ])
  expect(result.exitCode).toBe(0)
  expect(result.stdout.toString()).toBe("2\n")
  const failed = Bun.spawnSync(["bash", "-o", "pipefail", "-c", 'false | bash "$1"', "count-test", helperPath])
  expect(failed.exitCode).not.toBe(0)
})
