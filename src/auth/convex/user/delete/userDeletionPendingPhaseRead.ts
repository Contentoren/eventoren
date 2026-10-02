import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeletionPendingPhaseRead(ctx: MutationCtx, userId: IdUser) {
  // Legacy dependent writers can overlap the asynchronous cascade. Recheck
  // indexed dependencies in the final transaction before removing the user;
  // deletion and this fence are atomic, so no existing-user writer can race it.
  if (
    await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first()
  )
    return "sessions" as const
  if (
    await ctx.db
      .query("authOtps")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first()
  )
    return "otps" as const
  if (
    await ctx.db
      .query("authEmailLoginCodes")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first()
  )
    return "codes" as const
  if (
    await ctx.db
      .query("orgMembers")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first()
  )
    return "memberships" as const
  if (
    await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .first()
  )
    return "accounts" as const
  return null
}
