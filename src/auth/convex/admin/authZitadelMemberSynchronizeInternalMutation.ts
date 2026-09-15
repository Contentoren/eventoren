import { v } from "convex/values"
import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { createUserFromAuthProviderFn } from "#src/auth/convex/crud/createUserFromAuthProviderMutation.ts"
import { findUserByEmailFn } from "#src/auth/convex/crud/findUserByEmailQuery.ts"
import { linkAuthToExistingUserFn } from "#src/auth/convex/crud/linkAuthToExistingUserFn.ts"
import { synchronizeUserZitadelRolesFn } from "#src/auth/convex/crud/synchronizeUserZitadelRolesFn.ts"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import {
  type CommonAuthProvider,
  commonAuthProviderValidator,
} from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

export const authZitadelMemberSynchronizeInternalMutation = internalMutation({
  args: {
    createIfMissing: v.boolean(),
    organizerInvitedAt: v.optional(v.string()),
    provider: commonAuthProviderValidator,
  },
  handler: async (ctx, args): PromiseResult<DocUser | null> =>
    authZitadelMemberSynchronizeFn(ctx, args.provider, args.createIfMissing, args.organizerInvitedAt),
})

async function authZitadelMemberSynchronizeFn(
  ctx: MutationCtx,
  provider: CommonAuthProvider,
  createIfMissing: boolean,
  organizerInvitedAt?: string,
): PromiseResult<DocUser | null> {
  const op = "authZitadelMemberSynchronizeFn"
  const authAccount = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) => q.eq("provider", "zitadel").eq("providerAccountId", provider.providerId))
    .unique()
  let user = authAccount ? await ctx.db.get("users", authAccount.userId) : null
  if (authAccount && !user) return createResultError(op, "ZITADEL auth account points to a missing user")

  if (!user) {
    user = await ctx.db
      .query("users")
      .withIndex("zitadelUserId", (q) => q.eq("zitadelUserId", provider.providerId))
      .unique()
  }
  if (!user && provider.email) user = await findUserByEmailFn(ctx, provider.email)
  if (user?.deletedAt) return createResultError(op, "User account has been deleted")

  if (user) {
    if (!authAccount) await linkAuthToExistingUserFn(ctx, user._id as IdUser, "zitadel", provider.providerId)
    return synchronizeUserZitadelRolesFn(
      ctx,
      user._id as IdUser,
      provider.providerId,
      provider.zitadelRoles,
      organizerInvitedAt,
    )
  }
  if (!createIfMissing) return createResult(null)

  const createdResult = await createUserFromAuthProviderFn(ctx, { ...provider, zitadelRoles: [] })
  if (!createdResult.success) return createResultError(op, createdResult.errorMessage)
  const createdUserId = createdResult.data.userId as IdUser
  return synchronizeUserZitadelRolesFn(
    ctx,
    createdUserId,
    provider.providerId,
    provider.zitadelRoles,
    organizerInvitedAt,
  )
}
