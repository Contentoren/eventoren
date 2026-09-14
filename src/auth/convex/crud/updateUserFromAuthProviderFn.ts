import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import {
  type CommonAuthProvider,
  getUserNameFromCommonAuthProvider,
} from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

export async function updateUserFromAuthProviderFn(
  ctx: MutationCtx,
  userId: IdUser,
  authProvider: CommonAuthProvider,
): PromiseResult<string> {
  const op = "updateUserFromAuthProviderFn"

  const user = await ctx.db.get("users", userId)
  if (!user) {
    return createResultError(op, "User not found by userId: ", userId)
  }

  const userName = getUserNameFromCommonAuthProvider(authProvider, user.name || "Updated User")
  const userImage = authProvider.image ?? user.image
  const userEmail = authProvider.email ?? user.email

  // Only update if at least one field has changed
  const nameChanged = userName !== user.name
  const imageChanged = userImage !== user.image
  const emailChanged = userEmail !== user.email

  if (!nameChanged && !imageChanged && !emailChanged) {
    console.log(userId, "no changes")
    return createResult(userId)
  }
  if (nameChanged) console.log(userId, "name changed", user.name, "->", userName)
  if (imageChanged) console.log(userId, "image changed", user.image, "->", userImage)
  if (emailChanged) console.log(userId, "email changed", user.email, "->", userEmail)

  await ctx.db.patch("users", userId, {
    ...(nameChanged && { name: userName }),
    ...(imageChanged && { image: userImage }),
    ...(emailChanged && { email: userEmail }),
  })

  // Update auth account if needed
  const authAccount = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId).eq("provider", authProvider.provider))
    .unique()

  if (authAccount) {
    await ctx.db.patch("authAccounts", authAccount._id, {
      providerAccountId: authProvider.providerId,
      updatedAt: new Date().toISOString(),
    })
  }

  return createResult(userId)
}
