import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { apiKeyCredentialHash } from "#src/auth/model/apiKeyCredentialHash.ts"
import { authTokenSessionResolve } from "#src/utils/convex_backend/authTokenSessionResolve.ts"
import type { ResolvedCredential } from "#src/utils/convex_backend/ResolvedCredential.ts"

export async function authCredentialResolve(
  ctx: QueryCtx | MutationCtx,
  credential: string,
): PromiseResult<ResolvedCredential> {
  const op = "authCredentialResolve"
  const sessionResult = await authTokenSessionResolve(ctx, credential)
  if (sessionResult.success) {
    return createResult({
      kind: "jwt",
      userId: sessionResult.data.sub as IdUser,
      decodedToken: sessionResult.data,
    })
  }

  if (!/^[a-f0-9]{64}$/.test(credential)) return sessionResult

  const digest = await apiKeyCredentialHash(credential)
  const key = await ctx.db
    .query("authApiKeys")
    .withIndex("digest", (q) => q.eq("digest", digest))
    .unique()
  if (!key || key.revokedAt || key.expiredAt) return createResultError(op, "invalid credential")

  const now = Date.now()
  if (key.expiresAt && Date.parse(key.expiresAt) <= now) return createResultError(op, "expired credential")

  const owner = await ctx.db.get("users", key.userId)
  if (!owner || owner.deletedAt) return createResultError(op, "invalid credential")

  return createResult({ kind: "apiKey", userId: key.userId, ...(key.expiresAt && { expiresAt: key.expiresAt }) })
}
