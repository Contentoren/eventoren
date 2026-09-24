import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { userRoleIsAdmin } from "#src/auth/model_field/userRoleIsAdmin.ts"

export async function catalogAdminAuthorizeFn(ctx: MutationCtx | QueryCtx, userId: IdUser): PromiseResult<DocUser> {
  const op = "catalogAdminAuthorizeFn"
  const user = await ctx.db.get("users", userId)
  if (!user) return createResultError(op, "User not found")
  if (!userRoleIsAdmin(user.role)) return createResultError(op, "Admin role required")
  return createResult(user)
}
