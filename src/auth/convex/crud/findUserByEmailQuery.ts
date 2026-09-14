import { v } from "convex/values"
import { internalQuery, type QueryCtx } from "#convex/_generated/server.js"
import type { DocUser } from "#src/auth/convex/IdUser.ts"

export const findUserByEmailInternalQuery = internalQuery({
  args: { email: v.string() },
  handler: async (ctx: QueryCtx, args) => findUserByEmailFn(ctx, args.email),
})

export async function findUserByEmailFn(ctx: QueryCtx, email: string): Promise<DocUser | null> {
  return await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .unique()
}
