import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { createUserFromAuthProviderFn } from "#src/auth/convex/crud/createUserFromAuthProviderMutation.ts"
import { findUserByEmailFn } from "#src/auth/convex/crud/findUserByEmailQuery.ts"
import { linkAuthToExistingUserFn } from "#src/auth/convex/crud/linkAuthToExistingUserFn.ts"
import type { DocAuthAccount } from "#src/auth/convex/IdUser.ts"
import { docUserToUserProfile } from "#src/auth/convex/user/docUserToUserProfile.ts"
import { createUserSessionTimes, type UserSession } from "#src/auth/model/UserSession.ts"
import type { CommonAuthProvider } from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"
import { orgMemberGetHandleAndRoleFn } from "#src/org/member_convex/orgMemberGetHandleAndRoleInternalQuery.ts"

export type SignInUsingSocialAuthResultInternal = Omit<UserSession, "token">

export async function findOrCreateUserFn(
  ctx: MutationCtx,
  authData: CommonAuthProvider,
): PromiseResult<SignInUsingSocialAuthResultInternal> {
  const op = "findOrCreateUser"

  // Check for existing auth account
  const existingAuthAccount: DocAuthAccount | null = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", authData.provider).eq("providerAccountId", authData.providerId),
    )
    .unique()
  if (existingAuthAccount) {
    const user = await ctx.db.get("users", existingAuthAccount.userId)
    if (!user) return createResultError(op, "User not found by userId", existingAuthAccount.userId)
    if (user.deletedAt) return createResultError(op, "User account has been deleted")
    const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, user._id)
    const userProfile = docUserToUserProfile(user, orgHandle, orgRole)
    return createResult({
      profile: userProfile,
      hasPw: !!user.hashedPassword,
      signedInMethod: authData.provider,
      ...createUserSessionTimes(),
    })
  }

  // Check for existing user by email
  if (authData.email) {
    const existingUser = await findUserByEmailFn(ctx, authData.email)
    if (existingUser) {
      if (existingUser.deletedAt) return createResultError(op, "User account has been deleted")
      await linkAuthToExistingUserFn(ctx, existingUser._id, authData.provider, authData.providerId)
      const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, existingUser._id)
      const userProfile = docUserToUserProfile(existingUser, orgHandle, orgRole)
      return createResult({
        profile: userProfile,
        hasPw: !!existingUser.hashedPassword,
        signedInMethod: authData.provider,
        ...createUserSessionTimes(),
      })
    }
  }

  // No existing user found - create new one
  const createdResult = await createUserFromAuthProviderFn(ctx, authData)
  if (!createdResult.success) {
    return createResultError(op, "Failed to create user: " + createdResult.errorMessage)
  }
  const userSession: SignInUsingSocialAuthResultInternal = {
    profile: createdResult.data,
    hasPw: false,
    signedInMethod: authData.provider,
    ...createUserSessionTimes(),
  }
  return createResult(userSession)
}
