import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { verifyTokenResult } from "#src/auth/server/jwt_token/verifyTokenResult.ts"

export async function verifyTokenGetUserId(token: string): PromiseResult<IdUser> {
  const decoded = await verifyTokenResult(token)
  if (!decoded.success) return decoded
  return createResult(decoded.data.sub as IdUser)
}
