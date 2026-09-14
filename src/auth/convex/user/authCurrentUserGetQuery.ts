import { query, type QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { docUserToUserProfile } from "#src/auth/convex/user/docUserToUserProfile.ts"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { orgMemberGetHandleAndRoleFn } from "#src/org/member_convex/orgMemberGetHandleAndRoleInternalQuery.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { v } from "convex/values"

export const authCurrentUserGetQuery = query({
  args: { token: v.string() },
  handler: async (ctx, args) => authCurrentUserGetFn(ctx, args),
})

async function authCurrentUserGetFn(ctx: QueryCtx, args: { token: string }): PromiseResult<UserProfile> {
  const op = "authCurrentUserGetFn"
  return authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
    const session = await queryCtx.db
      .query("authSessions")
      .withIndex("token", (q) => q.eq("token", args.token))
      .unique()
    if (!session || session.expiresAt <= new Date().toISOString() || session.deletedAt) {
      return createResultError(op, "Authentication session is no longer valid")
    }

    const user = await queryCtx.db.get("users", userId)
    if (!user || user.deletedAt) return createResultError(op, "User not found")
    return createResult(await docUserToUserProfileWithOrganization(queryCtx, user))
  })
}

async function docUserToUserProfileWithOrganization(ctx: QueryCtx, user: DocUser): Promise<UserProfile> {
  const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, user._id as IdUser)
  return docUserToUserProfile(user, orgHandle, orgRole)
}
