import { createHash } from "node:crypto"
import { open, readFile, rename } from "node:fs/promises"
import { join } from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { createResult, createResultError } from "#result"
import { api } from "../../convex/_generated/api.js"
import { e2eCheckpointRootResolve } from "../checkpoint/e2eCheckpointRootResolve.ts"

type MarkPageResult = { success: boolean; errorMessage?: string; data?: unknown }
type SessionMarkFn = (args: { token: string; runId: string }) => Promise<MarkPageResult>

export type E2eAuthSessionEvidenceEntry = {
  sessionId: string
  creationTime: number
  runId: string
  tokenDigest: string
  markedAt: string
}

/**
 * Mark the exact newly created browser session token as an E2E fixture for
 * this run, then persist digest/ID evidence before the browser closes. The
 * token itself is never written to disk. A marking failure returns an error
 * so the calling test fails and retains its business fixtures.
 */
export async function e2eAuthSessionMark(input: {
  convexUrl: string
  runId: string
  token: string
  directory?: string
  environment?: Record<string, string | undefined>
  now?: number
  mark?: SessionMarkFn
}) {
  const op = "e2eAuthSessionMark"
  if (!/^[0-9a-z]+-[0-9a-f-]{36}$/u.test(input.runId)) return createResultError(op, "Invalid E2E run marker")
  if (!input.token) return createResultError(op, "Auth session token is missing")
  const convexUrl = input.convexUrl.trim()
  if (!convexUrl) return createResultError(op, "Missing E2E cleanup Convex URL")
  const root = await e2eCheckpointRootResolve({ directory: input.directory, environment: input.environment })
  if (!root.success) return root
  const directory = root.data.directory
  let marked: MarkPageResult
  try {
    marked = input.mark
      ? await input.mark({ token: input.token, runId: input.runId })
      : await new ConvexHttpClient(convexUrl).mutation(api.auth.authSessionE2eMarkMutation, {
          token: input.token,
          runId: input.runId,
        })
  } catch {
    return createResultError(op, "Auth session marking unavailable; fixtures retained")
  }
  if (!marked.success)
    return createResultError(op, marked.errorMessage ?? "Auth session marking rejected; fixtures retained")
  const data = (marked.data ?? {}) as { sessionId?: unknown; creationTime?: unknown; runId?: unknown }
  if (typeof data.sessionId !== "string" || typeof data.creationTime !== "number")
    return createResultError(op, "Auth session marking returned no session identity; fixtures retained")
  const tokenDigest = createHash("sha256").update(input.token, "utf8").digest("hex")
  const kept = await e2eAuthSessionEvidenceAppend(directory, input.runId, {
    sessionId: data.sessionId,
    creationTime: data.creationTime,
    runId: input.runId,
    tokenDigest,
    markedAt: new Date(input.now ?? Date.now()).toISOString(),
  })
  if (!kept.success) return kept
  return createResult({ sessionId: data.sessionId, creationTime: data.creationTime, runId: input.runId })
}

export function e2eAuthSessionEvidencePath(directory: string, runId: string): string {
  return join(directory, `auth-session-evidence-${runId}.json`)
}

async function e2eAuthSessionEvidenceAppend(directory: string, runId: string, entry: E2eAuthSessionEvidenceEntry) {
  const op = "e2eAuthSessionMark"
  const path = e2eAuthSessionEvidencePath(directory, runId)
  let sessions: E2eAuthSessionEvidenceEntry[] = []
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as { runId?: unknown; sessions?: unknown }
    if (parsed?.runId !== runId) return createResultError(op, "Auth evidence belongs to another run; fixtures retained")
    if (Array.isArray(parsed.sessions))
      sessions = parsed.sessions.filter(
        (candidate): candidate is E2eAuthSessionEvidenceEntry =>
          typeof (candidate as E2eAuthSessionEvidenceEntry)?.sessionId === "string",
      )
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      return createResultError(op, "Auth evidence could not be read; fixtures retained")
  }
  if (!sessions.some((candidate) => candidate.sessionId === entry.sessionId)) sessions.push(entry)
  try {
    const temp = `${path}.${crypto.randomUUID()}.tmp`
    const file = await open(temp, "wx", 0o600)
    try {
      await file.writeFile(JSON.stringify({ version: 1, runId, sessions }))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temp, path)
    return createResult(true)
  } catch {
    return createResultError(op, "Auth evidence could not be persisted; fixtures retained")
  }
}
