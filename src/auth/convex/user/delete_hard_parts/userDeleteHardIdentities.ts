import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardIdentities(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  const page = await ctx.db
    .query("authDeletionIdentities")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .paginate({ cursor, numItems: 100 })
  await Promise.all(page.page.map((identity) => ctx.db.delete("authDeletionIdentities", identity._id)))
  return { isDone: page.isDone, continueCursor: page.continueCursor }
}
