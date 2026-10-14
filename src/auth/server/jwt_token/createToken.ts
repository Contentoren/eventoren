import { SignJWT } from "jose"
import { authSecretRead } from "#src/auth/authSecretRead.ts"
import { tokenValidDurationInDays } from "./tokenValidDurationInDays.js"

export async function createToken(
  userId: string,
  secretSalt: string,
  payload?: Record<string, string>,
  expiresInDays = tokenValidDurationInDays,
): Promise<string> {
  const secret = authSecretRead(secretSalt)
  if (!secret) return ""
  const encodedSecret = new TextEncoder().encode(secret)
  const alg = "HS256"
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .sign(encodedSecret)
  return jwt
}
