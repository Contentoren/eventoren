import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardAuthSessions(ctx: MutationCtx, userId: IdUser): Promise<void> {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect()

  await Promise.all(sessions.map((session) => ctx.db.delete("authSessions", session._id)))
}
