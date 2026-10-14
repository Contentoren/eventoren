import { SignJWT } from "jose"
import { envAuthSecretResult } from "#src/app/env/private/envAuthSecretResult.ts"
import type { CommonAuthProvider } from "./social_identity_providers/CommonAuthProvider.ts"

export async function zitadelRoleSyncProofCreate(
  provider: CommonAuthProvider,
  organizationId?: string,
): Promise<string | undefined> {
  const secret = envAuthSecretResult()
  if (!secret.success) return undefined
  const key = new TextEncoder().encode(secret.data)
  return new SignJWT({ provider, organizationId: organizationId ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("eventoren-zitadel-role-sync")
    .setAudience("eventoren-auth")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key)
}
