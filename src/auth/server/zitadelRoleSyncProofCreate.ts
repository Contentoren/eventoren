import { SignJWT } from "jose"
import type { CommonAuthProvider } from "./social_identity_providers/CommonAuthProvider.ts"

export async function zitadelRoleSyncProofCreate(
  provider: CommonAuthProvider,
  organizationId?: string,
): Promise<string | undefined> {
  const secret = process.env.AUTH_SECRET?.trim()
  if (!secret || secret.startsWith("replace-with-")) return undefined
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ provider, organizationId: organizationId ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("eventoren-zitadel-role-sync")
    .setAudience("eventoren-auth")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(key)
}
