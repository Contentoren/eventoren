import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { v } from "convex/values"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { userRoleValidator } from "#src/auth/model_field/userRoleValidator.ts"

export const authUserRoleSetInternalMutation = internalMutation({
  args: { userId: vIdUser, role: userRoleValidator },
  handler: async (ctx, args) => authUserRoleSetFn(ctx, args.userId, args.role),
})

async function authUserRoleSetFn(ctx: MutationCtx, userId: IdUser, role: DocUser["role"]): Promise<DocUser | null> {
  const user = await ctx.db.get("users", userId)
  if (!user) return null
  await ctx.db.patch(userId, { role, updatedAt: new Date().toISOString() })
  return await ctx.db.get("users", userId)
}
