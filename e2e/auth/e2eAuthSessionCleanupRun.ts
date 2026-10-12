import { createHash } from "node:crypto"
import { readdir, readFile, unlink } from "node:fs/promises"
import { join } from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { createResult, createResultError } from "#result"
import { api } from "../../convex/_generated/api.js"
import type { E2eAuthSessionEvidenceEntry } from "./e2eAuthSessionMark.ts"

type SessionPageResult = { success: boolean; errorMessage?: string; data?: unknown }
type SessionDiscoveryFn = (args: { cursor: string | null }) => Promise<SessionPageResult>
type SessionCleanupFn = (args: { sessionIds: string[]; includeCallerSession: boolean }) => Promise<SessionPageResult>
type SessionMarkFn = (args: { token: string; runId: string }) => Promise<SessionPageResult>

const maxDiscoveryPages = 100
const historyBatchCap = 50
const evidencePrefix = "auth-session-evidence-"
const evidenceSuffix = ".json"

/**
 * Success-barrier auth-session phase. Runs only after the catalog/provider
 * final DB absence is verified by the caller. Always drains every backend
 * marked session via the admin query+cleanup, even with zero local evidence:
 * local evidence may be lost or live on another machine while old marked rows
 * remain discoverable, and a cleanup-only prior run has no evidence yet but
 * old marked rows must still drain. Only the owned-caller final self phase
 * is conditional on local run-evidence provenance (token digest match).
 *
 * The cleanup admin token is marked and self-deleted only when local run
 * evidence proves it is a dedicated newly created session of this run (token
 * digest match). An externally provided shared token never matches, stays
 * unmarked, and is never deleted; it can still drain marked others. The
 * mutation result is the absence proof because no query is possible after
 * self deletion. Local evidence is cleared only after backend absence;
 * any failure retains evidence and the checkpoint.
 */
export async function e2eAuthSessionCleanupRun(input: {
  directory: string
  runId: string
  convexUrl: string
  adminToken: string
  discovery?: SessionDiscoveryFn
  cleanup?: SessionCleanupFn
  mark?: SessionMarkFn
}) {
  const op = "e2eAuthSessionCleanupRun"
  const convexUrl = input.convexUrl.trim()
  const adminToken = input.adminToken.trim()
  if (!convexUrl || !adminToken)
    return createResultError(op, "Missing E2E cleanup Convex URL/admin token; checkpoint retained")
  const evidence = await e2eAuthSessionEvidenceReadAll(input.directory)
  const http = input.discovery && input.cleanup && input.mark ? null : new ConvexHttpClient(convexUrl)
  const discovery: SessionDiscoveryFn =
    input.discovery ??
    (async (args) => {
      try {
        return await http!.query(api.auth.authSessionE2eDiscoveryQuery, {
          token: adminToken,
          cursor: args.cursor ?? undefined,
        })
      } catch {
        return createResultError(op, "Marked auth-session inventory unavailable; checkpoint retained")
      }
    })
  const cleanup: SessionCleanupFn =
    input.cleanup ??
    (async (args) => {
      try {
        return await http!.mutation(api.auth.authSessionE2eCleanupMutation, {
          token: adminToken,
          sessionIds: args.sessionIds as never,
          includeCallerSession: args.includeCallerSession,
        })
      } catch {
        return createResultError(op, "Marked auth-session deletion unavailable; checkpoint retained")
      }
    })
  const mark: SessionMarkFn =
    input.mark ??
    (async (args) => {
      try {
        return await http!.mutation(api.auth.authSessionE2eMarkMutation, {
          token: args.token,
          runId: args.runId,
        })
      } catch {
        return createResultError(op, "Cleanup admin session marking unavailable; checkpoint retained")
      }
    })

  const digest = createHash("sha256").update(adminToken, "utf8").digest("hex")
  const owned = evidence.find((entry) => entry.runId === input.runId && entry.tokenDigest === digest)
  if (owned) {
    const reconciled = await mark({ token: adminToken, runId: input.runId })
    if (!reconciled.success)
      return createResultError(
        op,
        `Cleanup admin session provenance unverified: ${reconciled.errorMessage ?? "marking rejected"}; checkpoint retained`,
      )
    const reconciledId = (reconciled.data as { sessionId?: unknown } | null)?.sessionId
    if (reconciledId !== owned.sessionId)
      return createResultError(op, "Cleanup admin session does not match the owned evidence; checkpoint retained")
  }

  const drained = await e2eAuthSessionDiscoveryDrain(discovery)
  if (!drained.success) return drained
  const others = drained.data.filter((session) => session.sessionId !== owned?.sessionId)
  for (let index = 0; index < others.length; index += historyBatchCap) {
    const batch = others.slice(index, index + historyBatchCap)
    const cleaned = await cleanup({
      sessionIds: batch.map((session) => session.sessionId),
      includeCallerSession: false,
    })
    if (!cleaned.success)
      return createResultError(
        op,
        `Marked auth-session history unresolved: ${cleaned.errorMessage ?? "deletion rejected"}; checkpoint retained`,
      )
  }

  if (owned) {
    const last = await cleanup({ sessionIds: [owned.sessionId], includeCallerSession: true })
    if (!last.success)
      return createResultError(
        op,
        `Owned caller session unresolved: ${last.errorMessage ?? "self deletion rejected"}; checkpoint retained`,
      )
    const proof = (last.data ?? {}) as { callerDeleted?: unknown; remainingMarkedOthers?: unknown }
    if (proof.callerDeleted !== true || proof.remainingMarkedOthers !== 0)
      return createResultError(op, "Final self phase did not prove caller absence; checkpoint retained")
    const cleared = await e2eAuthSessionEvidenceClear(input.directory)
    if (!cleared.success) return cleared
    return createResult({
      status: "auth-sessions-absent" as const,
      deletedOthers: others.length,
      callerDeleted: true as const,
    })
  }

  const reverified = await e2eAuthSessionDiscoveryDrain(discovery)
  if (!reverified.success) return reverified
  if (reverified.data.length > 0)
    return createResultError(op, "Marked auth sessions remain after history deletion; checkpoint retained")
  const cleared = await e2eAuthSessionEvidenceClear(input.directory)
  if (!cleared.success) return cleared
  return createResult({
    status: "auth-sessions-absent" as const,
    deletedOthers: others.length,
    callerDeleted: false as const,
  })
}

async function e2eAuthSessionDiscoveryDrain(discovery: SessionDiscoveryFn) {
  const op = "e2eAuthSessionCleanupRun"
  const sessions: { sessionId: string; runId: string }[] = []
  let cursor: string | null = null
  for (let pages = 0; ; pages += 1) {
    if (pages >= maxDiscoveryPages)
      return createResultError(op, "Marked auth-session inventory truncated; checkpoint retained")
    const result = await discovery({ cursor })
    if (!result.success)
      return createResultError(
        op,
        `Marked auth-session inventory unresolved: ${result.errorMessage ?? "discovery rejected"}; checkpoint retained`,
      )
    const data = (result.data ?? {}) as {
      sessions?: unknown
      isDone?: unknown
      continueCursor?: unknown
    }
    if (Array.isArray(data.sessions))
      for (const entry of data.sessions) {
        const candidate = entry as { sessionId?: unknown; runId?: unknown }
        if (typeof candidate?.sessionId !== "string") continue
        if (sessions.some((session) => session.sessionId === candidate.sessionId)) continue
        sessions.push({
          sessionId: candidate.sessionId,
          runId: typeof candidate.runId === "string" ? candidate.runId : "",
        })
      }
    if (data.isDone === true) return createResult(sessions)
    const next = typeof data.continueCursor === "string" ? data.continueCursor : null
    if (!next || next === cursor)
      return createResultError(op, "Marked auth-session inventory truncated; checkpoint retained")
    cursor = next
  }
}

async function e2eAuthSessionEvidenceReadAll(directory: string): Promise<E2eAuthSessionEvidenceEntry[]> {
  let entries: string[]
  try {
    entries = (await readdir(directory)).filter(
      (entry) => entry.startsWith(evidencePrefix) && entry.endsWith(evidenceSuffix),
    )
  } catch {
    return []
  }
  const collected: E2eAuthSessionEvidenceEntry[] = []
  for (const entry of entries) {
    try {
      const parsed = JSON.parse(await readFile(join(directory, entry), "utf8")) as {
        sessions?: unknown
      }
      if (!Array.isArray(parsed.sessions)) continue
      for (const candidate of parsed.sessions) {
        const session = candidate as E2eAuthSessionEvidenceEntry
        if (
          typeof session?.sessionId === "string" &&
          typeof session?.runId === "string" &&
          typeof session?.tokenDigest === "string"
        )
          collected.push(session)
      }
    } catch {
      // Corrupt evidence never identifies ownership; the backend drain still
      // runs on explicit injectables or the default admin query.
    }
  }
  return collected
}

async function e2eAuthSessionEvidenceClear(directory: string) {
  const op = "e2eAuthSessionCleanupRun"
  let entries: string[]
  try {
    entries = (await readdir(directory)).filter(
      (entry) => entry.startsWith(evidencePrefix) && entry.endsWith(evidenceSuffix),
    )
  } catch {
    return createResultError(op, "Auth evidence could not be listed; reconcile it manually")
  }
  for (const entry of entries) {
    try {
      await unlink(join(directory, entry))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        return createResultError(op, `Auth evidence ${entry} could not be removed; reconcile it manually`)
    }
  }
  return createResult(true)
}
