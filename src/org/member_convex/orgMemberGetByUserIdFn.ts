import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import type { DocOrgMember } from "#src/org/member_convex/IdOrgMember.ts"

export async function orgMemberGetByUserIdFn(
  ctx: QueryCtx | MutationCtx,
  userId: IdUser,
): Promise<DocOrgMember | null> {
  return await ctx.db
    .query("orgMembers")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .first()
}
