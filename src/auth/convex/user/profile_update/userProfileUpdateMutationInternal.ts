import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { docUserToUserProfile } from "#src/auth/convex/user/docUserToUserProfile.ts"
import { userProfileUpdateFields } from "#src/auth/convex/user/profile_update/userProfileUpdate.ts"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import { orgMemberGetHandleAndRoleFn } from "#src/org/member_convex/orgMemberGetHandleAndRoleInternalQuery.ts"
import { createErrorAndLogError } from "#src/utils/convex_backend/createErrorAndLogError.ts"
import { createUserIdValidator } from "#src/utils/convex_backend/createUserIdValidator.ts"
import { nowIso } from "#utils/date/nowIso.js"

export const userProfileFieldsValidatorInternal = createUserIdValidator(userProfileUpdateFields)
export type UserProfileFieldsTypeInternal = typeof userProfileFieldsValidatorInternal.type

export const userProfileUpdateInternalMutation = internalMutation({
  args: userProfileFieldsValidatorInternal,
  handler: async (ctx, args) => userProfileUpdateInternalFn(ctx, args),
})

export async function userProfileUpdateInternalFn(
  ctx: MutationCtx,
  args: UserProfileFieldsTypeInternal,
): PromiseResult<UserProfile> {
  const op = "userProfileUpdateInternalFn"

  const userId = args.userId as IdUser
  const currentUser: DocUser | null = await ctx.db.get("users", userId)
  if (!currentUser) {
    return createErrorAndLogError(op, "User not found", userId)
  }

  const nameChanged = args.name !== undefined && args.name !== currentUser.name
  const imageChanged = args.image !== undefined && args.image !== currentUser.image
  const bioChanged = args.bio !== undefined && args.bio !== currentUser.bio
  const urlChanged = args.url !== undefined && args.url !== currentUser.url
  console.log({ op, nameChanged, imageChanged, bioChanged, urlChanged, args })

  if (!nameChanged && !imageChanged && !bioChanged && !urlChanged) {
    const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, userId)
    const profile = docUserToUserProfile(currentUser, orgHandle, orgRole)
    console.log(`${op}: No changes detected for user ${userId}, returning current profile`, profile)
    return createResult(profile)
  }

  const data: Partial<DocUser> = {
    name: args.name ?? currentUser.name,
    ...(imageChanged && { image: args.image }),
    ...(bioChanged && { bio: args.bio }),
    ...(urlChanged && { url: args.url }),
    updatedAt: nowIso(),
  }

  console.log(op + ".db.patch", data)
  await ctx.db.patch("users", userId, data)

  const updatedUser = await ctx.db.get("users", userId)
  if (!updatedUser) {
    return createErrorAndLogError(op, "User not found after update", userId)
  }
  console.log(op + ".updatedUser", updatedUser)

  const { orgHandle, orgRole } = await orgMemberGetHandleAndRoleFn(ctx, userId)
  const profile = docUserToUserProfile(updatedUser, orgHandle, orgRole)
  console.log(`${op}: Successfully updated profile for user ${userId}`, profile)
  return createResult(profile)
}
