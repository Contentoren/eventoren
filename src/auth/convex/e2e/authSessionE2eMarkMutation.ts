import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { catalogE2eRunMarkerExtract } from "#src/catalog/convex/catalogE2eRunMarkerExtract.ts"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"

const argsValidator = v.object({
  token: v.string(),
  runId: v.string(),
})

export type AuthSessionE2eMarkResult = {
  sessionId: string
  creationTime: number
  runId: string
}

/**
 * Mark the caller's own valid auth session as an E2E fixture for one exact
 * Eventoren run. The self token must resolve to a live session and user;
 * the run must match the existing ticket-e2e run pattern. Marking is
 * immutable: the same run re-marks idempotently, a different run is rejected.
 * Returns the session identity and run only, never the token.
 */
export const authSessionE2eMarkMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args): PromiseResult<AuthSessionE2eMarkResult> =>
    authSessionE2eMarkFn(ctx, args.token, args.runId),
})

async function authSessionE2eMarkFn(
  ctx: MutationCtx,
  token: string,
  runId: string,
): PromiseResult<AuthSessionE2eMarkResult> {
  const op = "authSessionE2eMarkMutation"
  const marker = catalogE2eRunMarkerExtract(`ticket-e2e-${runId}`)
  if (!marker.success) return createResultError(op, "Invalid E2E run marker")
  const resolved = await authTokenSessionResolve(ctx, token)
  if (!resolved.success) return resolved
  const session = await ctx.db
    .query("authSessions")
    .withIndex("token", (q) => q.eq("token", token))
    .unique()
  if (!session || session.userId !== resolved.data.sub) return createResultError(op, "Session not found")
  if (session.e2eRunId !== undefined) {
    if (session.e2eRunId === marker.data)
      return createResult({ sessionId: session._id, creationTime: session._creationTime, runId: marker.data })
    return createResultError(op, "E2E session mark is immutable")
  }
  const now = new Date().toISOString()
  await ctx.db.patch("authSessions", session._id, { e2eRunId: marker.data, e2eMarkedAt: now, updatedAt: now })
  return createResult({ sessionId: session._id, creationTime: session._creationTime, runId: marker.data })
}
