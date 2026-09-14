import { SignJWT } from "jose"
import { tokenValidDurationInDays } from "./tokenValidDurationInDays.js"

export async function createToken(
  userId: string,
  secretSalt: string,
  payload?: Record<string, string>,
  expiresInDays = tokenValidDurationInDays,
): Promise<string> {
  const op = "createToken"
  if (!secretSalt) return ""
  const encodedSecret = new TextEncoder().encode(secretSalt)
  const alg = "HS256"
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .sign(encodedSecret)
  return jwt
}
