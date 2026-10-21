import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { join } from "node:path"

const repoRoot = join(import.meta.dir, "..")
const bootstrap = join(repoRoot, "ops/convex/local-rehearsal/bootstrap.bash")

describe("local rehearsal bootstrap shell guard", () => {
  test("status path survives an sh/dash invocation without Bad substitution", () => {
    const run = spawnSync("sh", [bootstrap, "__no_such_command__"], {
      encoding: "utf8",
      timeout: 30_000,
    })
    const combined = `${run.stdout ?? ""}\n${run.stderr ?? ""}`
    expect(combined).not.toContain("Bad substitution")
    expect(combined).not.toContain("compgen: not found")
    // Unknown command reaches the usage branch (exit 1), never a shell break.
    expect(run.status).toBe(1)
  })
})
