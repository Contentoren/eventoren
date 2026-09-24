import { createRemoteJWKSet, jwtVerify } from "jose"

export async function zitadelIdTokenVerify(
  issuer: string,
  clientId: string,
  idToken: unknown,
  nonce: string | undefined,
): Promise<Record<string, unknown> | undefined> {
  if (typeof idToken !== "string" || !nonce) return undefined
  try {
    const keySet = createRemoteJWKSet(new URL(`${issuer}/oauth/v2/keys`))
    const verified = await jwtVerify(idToken, keySet, { issuer, audience: clientId })
    if (
      verified.payload.nonce !== nonce ||
      typeof verified.payload.exp !== "number" ||
      verified.payload.exp <= Math.floor(Date.now() / 1000)
    )
      return undefined
    return verified.payload as Record<string, unknown>
  } catch (error) {
    console.error("Zitadel sign-in: ID token verification failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    })
    return undefined
  }
}
