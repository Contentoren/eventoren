import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardAuthSessions(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .paginate({ cursor, numItems: 100 })

  await Promise.all(sessions.page.map((session) => ctx.db.delete("authSessions", session._id)))
  return { isDone: sessions.isDone, continueCursor: sessions.continueCursor }
}
