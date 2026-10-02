import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { createUserFromAuthProviderFn } from "#src/auth/convex/crud/createUserFromAuthProviderMutation.ts"
import { findUserByEmailFn } from "#src/auth/convex/crud/findUserByEmailQuery.ts"
import { linkAuthToExistingUserFn } from "#src/auth/convex/crud/linkAuthToExistingUserFn.ts"
import { synchronizeUserZitadelRolesFn } from "#src/auth/convex/crud/synchronizeUserZitadelRolesFn.ts"
import { updateUserFromAuthProviderFn } from "#src/auth/convex/crud/updateUserFromAuthProviderFn.ts"
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
  const deletingIdentity = await ctx.db
    .query("authDeletionIdentities")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", authData.provider).eq("providerAccountId", authData.providerId),
    )
    .first()
  if (deletingIdentity) return createResultError(op, "User account deletion is in progress")

  // Account cleanup may have reached its last pages while the user tombstone
  // still exists. Do not recreate an email-less identity during hard deletion.
  if (authData.provider === "zitadel") {
    const identity = await ctx.db
      .query("users")
      .withIndex("zitadelUserId", (q) => q.eq("zitadelUserId", authData.providerId))
      .first()
    if (identity?.deletedAt) return createResultError(op, "User account has been deleted")
  }

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
    if (authData.provider === "zitadel") {
      const profileUpdated = await updateUserFromAuthProviderFn(ctx, user._id, authData)
      if (!profileUpdated.success) return createResultError(op, profileUpdated.errorMessage)
    }
    const synchronized =
      authData.provider === "zitadel"
        ? await synchronizeUserZitadelRolesFn(
            ctx,
            user._id,
            authData.providerId,
            authData.zitadelRoles,
            undefined,
            authData.zitadelRoleSyncEnabled === true,
          )
        : createResult(user)
    if (!synchronized.success) return createResultError(op, synchronized.errorMessage)
    const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, synchronized.data._id)
    const userProfile = docUserToUserProfile(synchronized.data, orgHandle, orgRole)
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
      if (authData.provider === "zitadel") {
        const profileUpdated = await updateUserFromAuthProviderFn(ctx, existingUser._id, authData)
        if (!profileUpdated.success) return createResultError(op, profileUpdated.errorMessage)
      }
      const synchronized =
        authData.provider === "zitadel"
          ? await synchronizeUserZitadelRolesFn(
              ctx,
              existingUser._id,
              authData.providerId,
              authData.zitadelRoles,
              undefined,
              authData.zitadelRoleSyncEnabled === true,
            )
          : createResult(existingUser)
      if (!synchronized.success) return createResultError(op, synchronized.errorMessage)
      const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, synchronized.data._id)
      const userProfile = docUserToUserProfile(synchronized.data, orgHandle, orgRole)
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
    return createResultError(op, `Failed to create user: ${createdResult.errorMessage}`)
  }
  const userSession: SignInUsingSocialAuthResultInternal = {
    profile: createdResult.data,
    hasPw: false,
    signedInMethod: authData.provider,
    ...createUserSessionTimes(),
  }
  return createResult(userSession)
}
