import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { createResult, createResultError, type PromiseResult } from "#result"
import { verifyTokenGetUserId } from "#src/auth/server/jwt_token/verifyTokenGetUserId.ts"
import { ticketAccessDigestCreate } from "./ticketAccessDigestCreate.js"

export async function ticketOrderAccessResolve(input: {
  token?: string
  guestAccessToken?: string
}): PromiseResult<{ userId?: IdUser; guestAccessDigest?: string }> {
  const op = "ticketOrderAccessResolve"
  let userId: IdUser | undefined
  if (input.token) {
    const tokenResult = await verifyTokenGetUserId(input.token)
    if (!tokenResult.success) return tokenResult
    userId = tokenResult.data
  }

  let guestAccessDigest: string | undefined
  if (input.guestAccessToken) {
    if (!/^[A-Za-z0-9_-]{32,256}$/u.test(input.guestAccessToken))
      return createResultError(op, "Guest access token is invalid")
    const digestResult = await ticketAccessDigestCreate(input.guestAccessToken)
    if (!digestResult.success) return digestResult
    guestAccessDigest = digestResult.data
  }
  if (!userId && !guestAccessDigest) return createResultError(op, "Authentication is required")
  return createResult({ userId, guestAccessDigest })
}
