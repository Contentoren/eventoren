import { internalQuery, type QueryCtx } from "#convex/_generated/server.js"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"

export const userGetInternalQuery = internalQuery({
  args: { userId: vIdUser },
  handler: async (ctx: QueryCtx, args) => userGetQueryFn(ctx, args.userId),
})

export async function userGetQueryFn(ctx: QueryCtx, userId: IdUser): Promise<DocUser | null> {
  return await ctx.db.get("users", userId)
}
