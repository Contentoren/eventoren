import { SignJWT } from "jose"
import { envAuthSecretResult } from "#src/app/env/private/envAuthSecretResult.ts"
import type { CommonAuthProvider } from "./social_identity_providers/CommonAuthProvider.ts"

/**
 * Seals an Authworks sign-in profile verified by the Eventoren origin so the
 * Convex sign-in action only accepts server-mediated logins, never direct
 * client invocations. Mirrors the Zitadel role-sync proof without roles:
 * Authworks issues no project-role claims.
 */
export async function authworksLoginProofCreate(
  provider: CommonAuthProvider,
  organizationId?: string,
): Promise<string | undefined> {
  const secret = envAuthSecretResult()
  if (!secret.success) return undefined
  const key = new TextEncoder().encode(secret.data)
  return new SignJWT({ provider, organizationId: organizationId ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("eventoren-authworks-login")
    .setAudience("eventoren-auth")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key)
}
