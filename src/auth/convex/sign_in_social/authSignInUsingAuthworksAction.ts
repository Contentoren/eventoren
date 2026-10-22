import { jwtVerify } from "jose"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import { envAuthSecretResult } from "#src/app/env/private/envAuthSecretResult.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"
import {
  type CommonAuthProvider,
  commonAuthProviderValidator,
} from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

export const authSignInUsingAuthworksAction = action({
  args: commonAuthProviderValidator,
  handler: async (ctx, providerInfo: CommonAuthProvider): PromiseResult<UserSession> => {
    if (providerInfo.provider !== "authworks" || !(await loginProofVerify(providerInfo)))
      return createResultError("authSignInUsingAuthworksAction", "Invalid Authworks sign-in proof")
    const { zitadelRoleSyncProof: _, ...trustedProviderInfo } = providerInfo
    return ctx.runMutation(internal.auth.signInUsingSocialAuth3InternalMutation, trustedProviderInfo)
  },
})

async function loginProofVerify(providerInfo: CommonAuthProvider): Promise<boolean> {
  const secret = envAuthSecretResult()
  if (!secret.success || !providerInfo.zitadelRoleSyncProof) return false
  // An Authworks sign-in never carries roles: fail closed when role fields are present.
  if (providerInfo.zitadelRoles !== undefined || providerInfo.zitadelRoleSyncEnabled !== undefined) return false
  try {
    const verified = await jwtVerify(providerInfo.zitadelRoleSyncProof, new TextEncoder().encode(secret.data), {
      algorithms: ["HS256"],
      issuer: "eventoren-authworks-login",
      audience: "eventoren-auth",
    })
    const claims = verified.payload
    const { zitadelRoleSyncProof: _, ...unsignedProviderInfo } = providerInfo
    const signedProvider = claims.provider
    if (!signedProvider || typeof signedProvider !== "object" || Array.isArray(signedProvider)) return false
    const entries = (value: Record<string, unknown>) =>
      JSON.stringify(Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
    return entries(signedProvider as Record<string, unknown>) === entries(unsignedProviderInfo)
  } catch {
    return false
  }
}
