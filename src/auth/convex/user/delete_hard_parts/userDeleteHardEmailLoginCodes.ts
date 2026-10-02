import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardEmailLoginCodes(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  const codes = await ctx.db
    .query("authEmailLoginCodes")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .paginate({ cursor, numItems: 100 })

  await Promise.all(codes.page.map((code) => ctx.db.delete("authEmailLoginCodes", code._id)))
  return { isDone: codes.isDone, continueCursor: codes.continueCursor }
}
