import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardOrgMemberships(ctx: MutationCtx, userId: IdUser): Promise<void> {
  // Remove user's organization memberships
  const memberships = await ctx.db
    .query("orgMembers")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect()

  await Promise.all(memberships.map((membership) => ctx.db.delete("orgMembers", membership._id)))

  // Update invitations where user was the inviter to set invitedBy to null
  const invitationsWhereUserInvited = await ctx.db
    .query("orgInvitations")
    .filter((q) => q.eq(q.field("invitedBy"), userId))
    .collect()

  await Promise.all(
    invitationsWhereUserInvited.map((invitation) => ctx.db.patch("orgInvitations", invitation._id, { invitedBy: "" })),
  )
}
