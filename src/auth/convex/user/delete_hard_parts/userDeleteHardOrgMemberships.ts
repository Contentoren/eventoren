import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardOrgMemberships(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  // Remove user's organization memberships
  const memberships = await ctx.db
    .query("orgMembers")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .paginate({ cursor, numItems: 100 })

  await Promise.all(memberships.page.map((membership) => ctx.db.delete("orgMembers", membership._id)))
  return { isDone: memberships.isDone, continueCursor: memberships.continueCursor }
}
