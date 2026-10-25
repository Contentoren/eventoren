import { chmod, mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { e2eAuthSessionMark } from "./e2eAuthSessionMark.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

for (const target of ["production", "development"] as const) {
  test(`auth evidence default honors the parent's ${target} child directory without logging or persisting its token`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-directory-"))
    directories.push(directory)
    const names = ["E2E_TARGET", "E2E_BASE_URL", "E2E_CHECKPOINT_DIRECTORY"] as const
    const before = Object.fromEntries(names.map((name) => [name, process.env[name]]))
    const runId = "mtest-12345678-1234-1234-1234-123456789abc"
    const token = "offline-private-session-token"
    try {
      process.env.E2E_TARGET = target
      process.env.E2E_BASE_URL = target === "production" ? "https://eventoren.de" : "https://eventoren.leonardomora.de"
      process.env.E2E_CHECKPOINT_DIRECTORY = directory
      const result = await e2eAuthSessionMark({
        convexUrl: "https://offline.convex.cloud",
        runId,
        token,
        mark: async () => ({ success: true, data: { sessionId: "offline-session", creationTime: 111 } }),
      })
      expect(result.success).toBe(true)
      const raw = await readFile(join(directory, `auth-session-evidence-${runId}.json`), "utf8")
      expect(raw).not.toContain(token)
      expect(JSON.parse(raw).sessions[0].sessionId).toBe("offline-session")
    } finally {
      for (const name of names) {
        if (before[name] === undefined) delete process.env[name]
        else process.env[name] = before[name]
      }
    }
  })
}

test("auth evidence refuses a nonprivate explicit directory before external marking", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-unsafe-"))
  directories.push(directory)
  await chmod(directory, 0o755)
  let marked = false
  const result = await e2eAuthSessionMark({
    convexUrl: "https://offline.convex.cloud",
    runId: "mtest-12345678-1234-1234-1234-123456789abc",
    token: "offline-private-session-token",
    directory,
    mark: async () => {
      marked = true
      return { success: true, data: { sessionId: "offline-session", creationTime: 111 } }
    },
  })
  expect(result.success).toBe(false)
  expect(marked).toBe(false)
  expect(await readdir(directory)).toEqual([])
})
