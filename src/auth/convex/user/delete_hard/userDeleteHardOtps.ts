import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardOtps(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  const codes = await ctx.db
    .query("authOtps")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .paginate({ cursor, numItems: 100 })

  await Promise.all(codes.page.map((code) => ctx.db.delete("authOtps", code._id)))
  return { isDone: codes.isDone, continueCursor: codes.continueCursor }
}
