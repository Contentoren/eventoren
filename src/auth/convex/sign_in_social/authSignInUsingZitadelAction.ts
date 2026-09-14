import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import {
  type CommonAuthProvider,
  commonAuthProviderValidator,
} from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"

export const authSignInUsingZitadelAction = action({
  args: commonAuthProviderValidator,
  handler: async (ctx, providerInfo: CommonAuthProvider): PromiseResult<UserSession> =>
    ctx.runMutation(internal.auth.signInUsingSocialAuth3InternalMutation, providerInfo),
})
