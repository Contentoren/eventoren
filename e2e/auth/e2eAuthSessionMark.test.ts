import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { e2eAuthSessionMark } from "./e2eAuthSessionMark.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

test("auth session registration is run-stable and persists digest-only evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-session-"))
  directories.push(directory)
  const runId = "mtest-12345678-1234-1234-1234-123456789abc"
  const token = "secret-session-token-abc"
  const received: { token: string; runId: string }[] = []
  const mark = async (args: { token: string; runId: string }) => {
    received.push(args)
    return { success: true, data: { sessionId: "sess_1", creationTime: 111, runId: args.runId } }
  }
  const first = await e2eAuthSessionMark({ convexUrl: "https://example.convex.cloud", runId, token, directory, mark })
  expect(first.success).toBe(true)
  const second = await e2eAuthSessionMark({ convexUrl: "https://example.convex.cloud", runId, token, directory, mark })
  expect(second.success).toBe(true)
  if (!second.success) throw new Error("expected success")
  expect(second.data).toMatchObject({ sessionId: "sess_1", runId })
  expect(received).toHaveLength(2)
  expect(received[0]).toMatchObject({ token, runId })
  const raw = await readFile(join(directory, `auth-session-evidence-${runId}.json`), "utf8")
  expect(raw).not.toContain(token)
  const parsed = JSON.parse(raw) as { sessions: Record<string, unknown>[] }
  expect(parsed.sessions).toHaveLength(1)
  expect(parsed.sessions[0]).toMatchObject({ sessionId: "sess_1", runId })
  expect(parsed.sessions[0]?.tokenDigest).toMatch(/^[a-f0-9]{64}$/u)
  expect(parsed.sessions[0]).not.toHaveProperty("token")
})
