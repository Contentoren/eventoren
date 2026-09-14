import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { socialLoginProviderValidator } from "#src/auth/model_field/loginMethodValidator.ts"
import type { LoginProvider } from "#src/auth/model_field/socialLoginProvider.ts"

export const linkAuthToExistingUserValidator = v.object({
  userId: vIdUser,
  provider: socialLoginProviderValidator,
  providerId: v.string(),
})

export async function linkAuthToExistingUserFn(
  ctx: MutationCtx,
  userId: Id<"users">,
  provider: LoginProvider,
  providerId: string,
): Promise<Id<"users">> {
  const now = new Date().toISOString()
  // Create auth account for existing user
  await ctx.db.insert("authAccounts", {
    userId: userId,
    provider: provider,
    providerAccountId: providerId,
    // ...authData,
    createdAt: now,
    updatedAt: now,
  })
  return userId
}
