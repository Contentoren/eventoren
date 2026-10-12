import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdAuthSession, IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"

const argsValidator = v.object({
  token: v.string(),
  sessionIds: v.array(v.id("authSessions")),
  includeCallerSession: v.optional(v.boolean()),
})

export type AuthSessionE2eCleanupResult = {
  deletedSessionIds: string[]
  deletedCount: number
  callerDeleted: boolean
  remainingMarkedOthers: number
}

const batchCap = 50
const markedProbeTake = 2
const markedLowerBound = ""

/**
 * Hard-delete exactly the requested marked E2E sessions. Unmarked shared
 * sessions are never deleted by user ownership: every requested id must exist
 * and carry an E2E mark. The caller's own session is excluded unless the final
 * self phase is requested, which is allowed only after no other marked
 * sessions remain. Requires current admin proof.
 * Bounded marked-only semantics: discovery and the final gate page the
 * optional e2eRunId index with gte("", ) only (undefined sorts before strings,
 * so unmarked rows are excluded). The final gate is a bounded existence probe
 * (take 2 suffices: at most one row is the caller, so any second marked row
 * proves another marked other exists); no exact total is needed for the zero
 * proof. remainingMarkedOthers is bounded 0/1: 0 proves no other marked
 * session remains, 1 means at least one other marked session remains.
 */
export const authSessionE2eCleanupMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args): PromiseResult<AuthSessionE2eCleanupResult> =>
    authSessionE2eCleanupFn(ctx, args.token, args.sessionIds, args.includeCallerSession === true),
})

async function authSessionE2eCleanupFn(
  ctx: MutationCtx,
  token: string,
  sessionIds: IdAuthSession[],
  includeCallerSession: boolean,
): PromiseResult<AuthSessionE2eCleanupResult> {
  const op = "authSessionE2eCleanupMutation"
  const resolved = await authTokenSessionResolve(ctx, token)
  if (!resolved.success) return resolved
  const admin = await catalogAdminAuthorizeFn(ctx, resolved.data.sub as IdUser)
  if (!admin.success) return admin
  const caller = await ctx.db
    .query("authSessions")
    .withIndex("token", (q) => q.eq("token", token))
    .unique()
  if (!caller || caller.userId !== resolved.data.sub) return createResultError(op, "Caller session is no longer valid")
  const uniqueIds = [...new Set(sessionIds)]
  if (uniqueIds.length === 0 || uniqueIds.length > batchCap)
    return createResultError(op, "E2E session cleanup requires 1 to 50 exact session identifiers")
  const targets = []
  for (const sessionId of uniqueIds) {
    const session = await ctx.db.get("authSessions", sessionId)
    if (!session) return createResultError(op, "Requested session not found")
    if (session.e2eRunId === undefined) return createResultError(op, "Only marked E2E sessions can be deleted")
    targets.push(session)
  }
  const callerRequested = targets.some((session) => session._id === caller._id)
  const others = targets.filter((session) => session._id !== caller._id)
  if (callerRequested && !includeCallerSession)
    return createResultError(op, "Caller session is excluded without the final self phase")
  if (includeCallerSession) {
    const probe = await ctx.db
      .query("authSessions")
      .withIndex("e2eRunId", (q) => q.gte("e2eRunId", markedLowerBound))
      .take(markedProbeTake)
    // Bounded marked-only existence probe: take 2 suffices because the caller
    // is a single row; any second marked row proves another marked other
    // exists, and a single marked row is either the caller or one other.
    const remainingOthersExist = probe.some((session) => session._id !== caller._id)
    if (remainingOthersExist)
      return createResultError(op, "Final self phase requires zero remaining marked other sessions")
  }
  for (const session of others) await ctx.db.delete("authSessions", session._id)
  let callerDeleted = false
  if (callerRequested && includeCallerSession) {
    await ctx.db.delete("authSessions", caller._id)
    callerDeleted = true
  }
  const deletedSessionIds = [...others.map((session) => session._id), ...(callerDeleted ? [caller._id] : [])]
  const remainingProbe = await ctx.db
    .query("authSessions")
    .withIndex("e2eRunId", (q) => q.gte("e2eRunId", markedLowerBound))
    .take(markedProbeTake)
  const remainingMarkedOthers = remainingProbe.some((session) => session._id !== caller._id) ? 1 : 0
  return createResult({
    deletedSessionIds,
    deletedCount: deletedSessionIds.length,
    callerDeleted,
    remainingMarkedOthers,
  })
}
