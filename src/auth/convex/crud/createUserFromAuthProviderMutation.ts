import type { WithoutSystemFields } from "convex/server"
import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser } from "#src/auth/convex/IdUser.ts"
import { docUserToUserProfile } from "#src/auth/convex/user/docUserToUserProfile.ts"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { loginProvider } from "#src/auth/model_field/socialLoginProvider.ts"
import { userRole } from "#src/auth/model_field/userRole.ts"
import { userRoleSource } from "#src/auth/model_field/userRoleSource.ts"
import { zitadelRolesToUserRole } from "#src/auth/model_field/zitadelRolesToUserRole.ts"
import {
  type CommonAuthProvider,
  commonAuthProviderValidator,
  getUserNameFromCommonAuthProvider,
} from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

export type UserFields = WithoutSystemFields<DocUser>

export const createUserFromAuthProviderInternalMutation = internalMutation({
  args: commonAuthProviderValidator,
  handler: createUserFromAuthProviderFn,
})

export async function createUserFromAuthProviderFn(
  ctx: MutationCtx,
  authProvider: CommonAuthProvider,
): PromiseResult<UserProfile> {
  const op = "createUserFromAuthProviderFn"

  // Check if authAccount already exists
  const existingAuthAccount = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", authProvider.provider).eq("providerAccountId", authProvider.providerId),
    )
    .unique()
  if (existingAuthAccount) {
    return createResultError(op, "Auth account already exists")
  }

  const now = new Date()
  const iso = now.toISOString()

  // Create user
  const userName = getUserNameFromCommonAuthProvider(authProvider, "New User")
  const isZitadel = authProvider.provider === loginProvider.zitadel
  const zitadelRoles = isZitadel && authProvider.zitadelRoles ? [...authProvider.zitadelRoles] : undefined
  const toCreate = {
    name: userName,
    image: authProvider.image,
    ...(authProvider.email ? { email: authProvider.email } : {}),
    role: isZitadel ? zitadelRolesToUserRole(zitadelRoles ?? []) : userRole.customer,
    ...(isZitadel
      ? {
          roleSource: userRoleSource.zitadel,
          zitadelUserId: authProvider.providerId,
          ...(zitadelRoles
            ? {
                zitadelRoles,
                zitadelRolesSynchronizedAt: iso,
                ...(zitadelRoles.includes("organizer") ? { organizerInvitedAt: iso } : {}),
              }
            : {}),
        }
      : {}),
    createdAt: iso,
    updatedAt: iso,
  } as const satisfies WithoutSystemFields<DocUser>
  const userId = await ctx.db.insert("users", toCreate)
  const userProfile: UserProfile = docUserToUserProfile({
    _id: userId,
    _creationTime: now.getTime(),
    ...toCreate,
  })

  // Create auth account
  await ctx.db.insert("authAccounts", {
    userId,
    provider: authProvider.provider,
    providerAccountId: authProvider.providerId,
    createdAt: iso,
    updatedAt: iso,
  })

  return createResult(userProfile)
}
