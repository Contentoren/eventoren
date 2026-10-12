import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "@rstest/core"
import { e2eAuthSessionCleanupRun } from "./e2eAuthSessionCleanupRun.ts"
import { e2eAuthSessionMark } from "./e2eAuthSessionMark.ts"

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

const runId = "mtest-12345678-1234-1234-1234-123456789abc"
const convexUrl = "https://example.convex.cloud"

test("auth session phase drains marked history and deletes the owned caller last", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-session-"))
  directories.push(directory)
  const adminToken = "dedicated-admin-token"
  const mark = async () => ({ success: true, data: { sessionId: "sess_caller", creationTime: 7, runId } })
  expect((await e2eAuthSessionMark({ convexUrl, runId, token: adminToken, directory, mark })).success).toBe(true)
  const calls: { sessionIds: string[]; includeCallerSession: boolean }[] = []
  const discovery = async () => ({
    success: true,
    data: {
      scannedSessions: 2,
      isDone: true,
      continueCursor: null,
      sessions: [
        {
          sessionId: "sess_old",
          userId: "user-old",
          runId: "mold-12345678-1234-1234-1234-123456789abc",
          markedAt: "2026-10-01T00:00:00.000Z",
          creationTime: 1,
        },
        {
          sessionId: "sess_caller",
          userId: "user-caller",
          runId,
          markedAt: "2026-10-02T00:00:00.000Z",
          creationTime: 7,
        },
      ],
    },
  })
  const cleanup = async (args: { sessionIds: string[]; includeCallerSession: boolean }) => {
    calls.push(args)
    if (args.includeCallerSession)
      return {
        success: true,
        data: { deletedSessionIds: args.sessionIds, deletedCount: 1, callerDeleted: true, remainingMarkedOthers: 0 },
      }
    return {
      success: true,
      data: {
        deletedSessionIds: args.sessionIds,
        deletedCount: args.sessionIds.length,
        callerDeleted: false,
        remainingMarkedOthers: 0,
      },
    }
  }
  const result = await e2eAuthSessionCleanupRun({ directory, runId, convexUrl, adminToken, discovery, cleanup, mark })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ callerDeleted: true })
  expect(calls).toHaveLength(2)
  expect(calls[0]).toMatchObject({ sessionIds: ["sess_old"], includeCallerSession: false })
  expect(calls[1]).toMatchObject({ sessionIds: ["sess_caller"], includeCallerSession: true })
  const remaining = (await readdir(directory)).filter((entry) => entry.startsWith("auth-session-evidence-"))
  expect(remaining).toHaveLength(0)
})

test("auth session phase drains marked history with zero local evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-session-"))
  directories.push(directory)
  const adminToken = "external-shared-admin-token"
  let discovered = 0
  const discovery = async () => {
    discovered++
    if (discovered === 1)
      return {
        success: true,
        data: {
          scannedSessions: 1,
          isDone: true,
          continueCursor: null,
          sessions: [
            {
              sessionId: "sess_old",
              userId: "user-old",
              runId: "mold-12345678-1234-1234-1234-123456789abc",
              markedAt: "2026-10-01T00:00:00.000Z",
              creationTime: 1,
            },
          ],
        },
      }
    return { success: true, data: { scannedSessions: 0, isDone: true, continueCursor: null, sessions: [] } }
  }
  const calls: { sessionIds: string[]; includeCallerSession: boolean }[] = []
  const cleanup = async (args: { sessionIds: string[]; includeCallerSession: boolean }) => {
    calls.push(args)
    return {
      success: true,
      data: {
        deletedSessionIds: args.sessionIds,
        deletedCount: args.sessionIds.length,
        callerDeleted: false,
        remainingMarkedOthers: 0,
      },
    }
  }
  const mark = async () => ({ success: false, errorMessage: "unexpected mark without owned evidence" })
  const result = await e2eAuthSessionCleanupRun({ directory, runId, convexUrl, adminToken, discovery, cleanup, mark })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ callerDeleted: false, deletedOthers: 1 })
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({ sessionIds: ["sess_old"], includeCallerSession: false })
})

test("auth session phase retains evidence when history deletion fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-session-"))
  directories.push(directory)
  const adminToken = "external-shared-admin-token"
  const mark = async () => ({ success: true, data: { sessionId: "sess_browser", creationTime: 9, runId } })
  expect((await e2eAuthSessionMark({ convexUrl, runId, token: "browser-token", directory, mark })).success).toBe(true)
  const calls: { sessionIds: string[]; includeCallerSession: boolean }[] = []
  const discovery = async () => ({
    success: true,
    data: {
      scannedSessions: 1,
      isDone: true,
      continueCursor: null,
      sessions: [
        {
          sessionId: "sess_old",
          userId: "user-old",
          runId: "mold-12345678-1234-1234-1234-123456789abc",
          markedAt: "2026-10-01T00:00:00.000Z",
          creationTime: 1,
        },
      ],
    },
  })
  const cleanup = async (args: { sessionIds: string[]; includeCallerSession: boolean }) => {
    calls.push(args)
    return { success: false, errorMessage: "history deletion unavailable" }
  }
  const result = await e2eAuthSessionCleanupRun({ directory, runId, convexUrl, adminToken, discovery, cleanup, mark })
  expect(result.success).toBe(false)
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({ includeCallerSession: false })
  const remaining = (await readdir(directory)).filter((entry) => entry.startsWith("auth-session-evidence-"))
  expect(remaining).toHaveLength(1)
  const raw = await readFile(join(directory, remaining[0] as string), "utf8")
  expect(raw).toContain("sess_browser")
})

test("auth session phase chunks 120 marked others into 50/50/20 before the owned caller final", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-session-"))
  directories.push(directory)
  const adminToken = "dedicated-admin-token"
  const mark = async () => ({ success: true, data: { sessionId: "sess_caller", creationTime: 7, runId } })
  expect((await e2eAuthSessionMark({ convexUrl, runId, token: adminToken, directory, mark })).success).toBe(true)
  const otherIds = Array.from({ length: 120 }, (_, index) => `sess_old_${String(index).padStart(3, "0")}`)
  const sharedSessionId = "sess_shared_unmarked"
  const discovery = async () => ({
    success: true,
    data: {
      scannedSessions: 121,
      isDone: true,
      continueCursor: null,
      sessions: [
        ...otherIds.map((sessionId, index) => ({
          sessionId,
          userId: `user-old-${index}`,
          runId: "mold-12345678-1234-1234-1234-123456789abc",
          markedAt: "2026-10-01T00:00:00.000Z",
          creationTime: index + 1,
        })),
        {
          sessionId: "sess_caller",
          userId: "user-caller",
          runId,
          markedAt: "2026-10-02T00:00:00.000Z",
          creationTime: 7,
        },
      ],
    },
  })
  const calls: { sessionIds: string[]; includeCallerSession: boolean }[] = []
  const cleanup = async (args: { sessionIds: string[]; includeCallerSession: boolean }) => {
    calls.push(args)
    if (args.includeCallerSession)
      return {
        success: true,
        data: { deletedSessionIds: args.sessionIds, deletedCount: 1, callerDeleted: true, remainingMarkedOthers: 0 },
      }
    return {
      success: true,
      data: {
        deletedSessionIds: args.sessionIds,
        deletedCount: args.sessionIds.length,
        callerDeleted: false,
        remainingMarkedOthers: 0,
      },
    }
  }
  const result = await e2eAuthSessionCleanupRun({ directory, runId, convexUrl, adminToken, discovery, cleanup, mark })
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("expected success")
  expect(result.data).toMatchObject({ callerDeleted: true, deletedOthers: 120 })
  expect(calls).toHaveLength(4)
  expect(calls[0]?.sessionIds).toHaveLength(50)
  expect(calls[1]?.sessionIds).toHaveLength(50)
  expect(calls[2]?.sessionIds).toHaveLength(20)
  expect(calls[3]).toMatchObject({ sessionIds: ["sess_caller"], includeCallerSession: true })
  for (const call of calls.slice(0, 3)) {
    expect(call.includeCallerSession).toBe(false)
    expect(call.sessionIds).not.toContain("sess_caller")
    expect(call.sessionIds).not.toContain(sharedSessionId)
  }
  const drainedOthers = calls.slice(0, 3).flatMap((call) => call.sessionIds)
  expect(new Set(drainedOthers).size).toBe(120)
})

test("auth session phase retains ledger without self delete when a history batch fails", async () => {
  const directory = await mkdtemp(join(tmpdir(), "eventoren-auth-session-"))
  directories.push(directory)
  const adminToken = "dedicated-admin-token"
  const mark = async () => ({ success: true, data: { sessionId: "sess_caller", creationTime: 7, runId } })
  expect((await e2eAuthSessionMark({ convexUrl, runId, token: adminToken, directory, mark })).success).toBe(true)
  const otherIds = Array.from({ length: 60 }, (_, index) => `sess_old_${String(index).padStart(3, "0")}`)
  const discovery = async () => ({
    success: true,
    data: {
      scannedSessions: 61,
      isDone: true,
      continueCursor: null,
      sessions: [
        ...otherIds.map((sessionId, index) => ({
          sessionId,
          userId: `user-old-${index}`,
          runId: "mold-12345678-1234-1234-1234-123456789abc",
          markedAt: "2026-10-01T00:00:00.000Z",
          creationTime: index + 1,
        })),
        {
          sessionId: "sess_caller",
          userId: "user-caller",
          runId,
          markedAt: "2026-10-02T00:00:00.000Z",
          creationTime: 7,
        },
      ],
    },
  })
  const calls: { sessionIds: string[]; includeCallerSession: boolean }[] = []
  const cleanup = async (args: { sessionIds: string[]; includeCallerSession: boolean }) => {
    calls.push(args)
    if (!args.includeCallerSession && args.sessionIds.length < 50)
      return { success: false, errorMessage: "second history batch unavailable" }
    return {
      success: true,
      data: {
        deletedSessionIds: args.sessionIds,
        deletedCount: args.sessionIds.length,
        callerDeleted: false,
        remainingMarkedOthers: 0,
      },
    }
  }
  const result = await e2eAuthSessionCleanupRun({ directory, runId, convexUrl, adminToken, discovery, cleanup, mark })
  expect(result.success).toBe(false)
  expect(calls).toHaveLength(2)
  expect(calls[0]?.sessionIds).toHaveLength(50)
  expect(calls[1]?.sessionIds).toHaveLength(10)
  expect(calls.some((call) => call.includeCallerSession)).toBe(false)
  const remaining = (await readdir(directory)).filter((entry) => entry.startsWith("auth-session-evidence-"))
  expect(remaining).toHaveLength(1)
  const raw = await readFile(join(directory, remaining[0] as string), "utf8")
  expect(raw).toContain("sess_caller")
})
