import { mutation, type MutationCtx } from "#convex/_generated/server.js"
import { v } from "convex/values"

export const authSessionRevokeMutation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => authSessionRevokeFn(ctx, args.token),
})

async function authSessionRevokeFn(ctx: MutationCtx, token: string): Promise<boolean> {
  const session = await ctx.db
    .query("authSessions")
    .withIndex("token", (q) => q.eq("token", token))
    .unique()
  if (!session) return false
  await ctx.db.delete(session._id)
  return true
}
