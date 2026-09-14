import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { userRoleIsDevOrAdmin } from "#src/auth/model_field/userRole.ts"

export async function catalogAdminAuthorizeFn(ctx: MutationCtx, userId: IdUser): PromiseResult<DocUser> {
  const op = "catalogAdminAuthorizeFn"
  const user = await ctx.db.get("users", userId)
  if (!user) return createResultError(op, "User not found")
  if (!userRoleIsDevOrAdmin(user.role)) return createResultError(op, "Admin role required")
  return createResult(user)
}
