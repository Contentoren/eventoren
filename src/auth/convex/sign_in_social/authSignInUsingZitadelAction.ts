import { jwtVerify } from "jose"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import type { UserSession } from "#src/auth/model/UserSession.ts"
import {
  type CommonAuthProvider,
  commonAuthProviderValidator,
} from "#src/auth/server/social_identity_providers/CommonAuthProvider.ts"

export const authSignInUsingZitadelAction = action({
  args: commonAuthProviderValidator,
  handler: async (ctx, providerInfo: CommonAuthProvider): PromiseResult<UserSession> => {
    if (providerInfo.provider !== "zitadel" || !(await roleSyncProofVerify(providerInfo)))
      return createResultError("authSignInUsingZitadelAction", "Invalid Zitadel sign-in proof")
    const { zitadelRoleSyncProof: _, ...trustedProviderInfo } = providerInfo
    return ctx.runMutation(internal.auth.signInUsingSocialAuth3InternalMutation, trustedProviderInfo)
  },
})

async function roleSyncProofVerify(providerInfo: CommonAuthProvider): Promise<boolean> {
  const secret = process.env.AUTH_SECRET?.trim()
  if (!secret || secret.startsWith("replace-with-") || !providerInfo.zitadelRoleSyncProof) return false
  try {
    const verified = await jwtVerify(providerInfo.zitadelRoleSyncProof, new TextEncoder().encode(secret), {
      issuer: "eventoren-zitadel-role-sync",
      audience: "eventoren-auth",
    })
    const claims = verified.payload
    const { zitadelRoleSyncProof: _, ...unsignedProviderInfo } = providerInfo
    const signedProvider = claims.provider
    if (!signedProvider || typeof signedProvider !== "object" || Array.isArray(signedProvider)) return false
    const entries = (value: Record<string, unknown>) =>
      JSON.stringify(Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
    return (
      entries(signedProvider as Record<string, unknown>) === entries(unsignedProviderInfo) &&
      (providerInfo.zitadelRoleSyncEnabled === true
        ? typeof claims.organizationId === "string" &&
          claims.organizationId.length > 0 &&
          Array.isArray(providerInfo.zitadelRoles)
        : claims.organizationId === null)
    )
  } catch {
    return false
  }
}
