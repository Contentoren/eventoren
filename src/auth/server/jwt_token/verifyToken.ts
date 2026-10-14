import { jwtVerify } from "jose"
import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authSecretRead } from "#src/auth/authSecretRead.ts"
import { type DecodedToken, decodedTokenSchema } from "#src/auth/model/DecodedToken.ts"

export async function verifyToken(token: string, secret: string | undefined): PromiseResult<DecodedToken> {
  const op = "verifyToken"
  const normalizedSecret = authSecretRead(secret)
  if (!normalizedSecret) return createResultError(op, "missing secret")
  try {
    const encodedSecret = new TextEncoder().encode(normalizedSecret)
    const verified = await jwtVerify(token, encodedSecret, { algorithms: ["HS256"] })
    const decoded = a.parse(decodedTokenSchema, verified.payload)
    return createResult(decoded)
  } catch (e: any) {
    return createResultError(op, e.message)
  }
}
