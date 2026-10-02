import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function userDeleteHardInvitations(ctx: MutationCtx, userId: IdUser, cursor: string | null = null) {
  // No invitedBy index exists on this legacy table. Visit every bounded page,
  // retaining other inviters' records and the original empty-string sentinel.
  const invitations = await ctx.db.query("orgInvitations").paginate({ cursor, numItems: 100 })
  await Promise.all(
    invitations.page
      .filter((invitation) => invitation.invitedBy === userId)
      .map((invitation) => ctx.db.patch("orgInvitations", invitation._id, { invitedBy: "" })),
  )
  return { isDone: invitations.isDone, continueCursor: invitations.continueCursor }
}
