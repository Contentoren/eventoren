import { internal } from "#convex/_generated/api.js"
import { type ActionCtx, internalAction } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authZitadelRolesFromUserGrants } from "#src/auth/convex/admin/authZitadelRolesFromUserGrants.ts"
import { authZitadelUserGrantsRead } from "#src/auth/convex/admin/authZitadelUserGrantsRead.ts"

export const authZitadelRolesSynchronizeScheduledAction = internalAction({
  args: {},
  handler: async (ctx): PromiseResult<{ synchronized: number }> => authZitadelRolesSynchronizeScheduledFn(ctx),
})

async function authZitadelRolesSynchronizeScheduledFn(ctx: ActionCtx): PromiseResult<{ synchronized: number }> {
  const candidates = await ctx.runQuery(internal.auth.authZitadelSyncCandidatesInternalQuery, {})
  if (candidates.length === 0) return createResult({ synchronized: 0 })
  const grantsResult = await authZitadelUserGrantsRead()
  if (!grantsResult.success) return grantsResult

  let synchronized = 0
  for (const candidate of candidates) {
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
  return createResult({ synchronized })
}
