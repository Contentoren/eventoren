import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"

const pageSize = 100

const argsValidator = v.object({
  token: v.string(),
  cursor: v.optional(v.string()),
})

export type AuthSessionE2eDiscoveryResult = {
  scannedSessions: number
  isDone: boolean
  continueCursor: string | null
  sessions: {
    sessionId: string
    userId: string
    runId: string
    markedAt: string
    creationTime: number
  }[]
}

/**
 * Read-only paged inventory of marked E2E auth sessions only. Unmarked shared
 * sessions never appear. Token and expiry values are never returned.
 * Pages the optional e2eRunId index with a non-null lower bound only, so
 * genuine unmarked volume never truncates discovery: Convex sorts undefined
 * before strings, so gte("", ) returns marked rows exclusively.
 */
export const authSessionE2eDiscoveryQuery = query({
  args: argsValidator,
  handler: async (ctx, args) => authQueryTokenToUserId(ctx, args, authSessionE2eDiscoveryAuthorized),
})

async function authSessionE2eDiscoveryAuthorized(
  ctx: QueryCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<AuthSessionE2eDiscoveryResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const batch = await ctx.db
    .query("authSessions")
    .withIndex("e2eRunId", (q) => q.gte("e2eRunId", ""))
    .paginate({ cursor: args.cursor ?? null, numItems: pageSize })
  const sessions: AuthSessionE2eDiscoveryResult["sessions"] = []
  for (const session of batch.page) {
    if (session.e2eRunId === undefined || session.e2eMarkedAt === undefined) continue
    sessions.push({
      sessionId: session._id,
      userId: session.userId,
      runId: session.e2eRunId,
      markedAt: session.e2eMarkedAt,
      creationTime: session._creationTime,
    })
  }
  return createResult({
    scannedSessions: batch.page.length,
    isDone: batch.isDone,
    continueCursor: batch.continueCursor,
    sessions,
  })
}
