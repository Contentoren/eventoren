import { internal } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authZitadelRolesFromUserGrants } from "#src/auth/convex/admin/authZitadelRolesFromUserGrants.ts"
import { authZitadelUserGrantsRead } from "#src/auth/convex/admin/authZitadelUserGrantsRead.ts"
import type { DocUser } from "#src/auth/convex/IdUser.ts"
import { userRoleIsDevOrAdmin } from "#src/auth/model_field/userRole.ts"
import { userRoleSource } from "#src/auth/model_field/userRoleSource.ts"

export async function authAdminZitadelAccessReadFn(ctx: ActionCtx, token: string): PromiseResult<DocUser> {
  const currentResult = await ctx.runQuery(internal.auth.authCurrentUserByTokenInternalQuery, { token })
  if (!currentResult.success) return currentResult
  let user = currentResult.data

  if (user.roleSource === userRoleSource.zitadel && !user.zitadelUserId) {
    return createResultError("authAdminZitadelAccessReadFn", "ZITADEL user identity is missing")
  }

  if (user.roleSource === userRoleSource.zitadel && user.zitadelUserId) {
    const grantsResult = await authZitadelUserGrantsRead(user.zitadelUserId)
    if (!grantsResult.success) return grantsResult
    const synchronizedResult = await ctx.runMutation(internal.auth.authUserZitadelRolesSynchronizeInternalMutation, {
      roles: [...authZitadelRolesFromUserGrants(grantsResult.data)],
      userId: user._id,
      zitadelUserId: user.zitadelUserId,
    })
    if (!synchronizedResult.success) return synchronizedResult
    user = synchronizedResult.data
  }

  if (!userRoleIsDevOrAdmin(user.role)) return createResultError("authAdminZitadelAccessReadFn", "Admin role required")
  return createResult(user)
}
