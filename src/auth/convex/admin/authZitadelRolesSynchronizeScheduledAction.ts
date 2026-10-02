import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { type ActionCtx, internalAction } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authZitadelRolesFromUserGrants } from "#src/auth/convex/admin/authZitadelRolesFromUserGrants.ts"
import { authZitadelUserGrantsRead } from "#src/auth/convex/admin/authZitadelUserGrantsRead.ts"

export const authZitadelRolesSynchronizeScheduledAction = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args): PromiseResult<{ synchronized: number }> =>
    authZitadelRolesSynchronizeScheduledFn(ctx, args.cursor),
})

async function authZitadelRolesSynchronizeScheduledFn(
  ctx: ActionCtx,
  cursor?: string,
): PromiseResult<{ synchronized: number }> {
  const candidates = await ctx.runQuery(internal.auth.authZitadelSyncCandidatesInternalQuery, {
    paginationOpts: { cursor: cursor ?? null, numItems: 100 },
  })
  if (candidates.page.length === 0) {
    if (!candidates.isDone)
      await ctx.scheduler.runAfter(0, internal.auth.authZitadelRolesSynchronizeScheduledAction, {
        cursor: candidates.continueCursor,
      })
    return createResult({ synchronized: 0 })
  }
  const grantsResult = await authZitadelUserGrantsRead()
  if (!grantsResult.success) return grantsResult

  let synchronized = 0
  for (const candidate of candidates.page) {
    const roles = authZitadelRolesFromUserGrants(
      grantsResult.data.filter((grant) => grant.userId === candidate.zitadelUserId),
    )
    const syncResult = await ctx.runMutation(internal.auth.authUserZitadelRolesSynchronizeInternalMutation, {
      roles: [...roles],
      userId: candidate.userId,
      zitadelUserId: candidate.zitadelUserId,
    })
    if (!syncResult.success) return createResultError("authZitadelRolesSynchronizeScheduledFn", syncResult.errorMessage)
    synchronized += 1
  }
  if (!candidates.isDone)
    await ctx.scheduler.runAfter(0, internal.auth.authZitadelRolesSynchronizeScheduledAction, {
      cursor: candidates.continueCursor,
    })
  return createResult({ synchronized })
}
