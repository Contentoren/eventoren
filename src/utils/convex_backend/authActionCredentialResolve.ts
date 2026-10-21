import { internal } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createResultError, type PromiseResult } from "#result"
import type { ResolvedCredential } from "#src/utils/convex_backend/ResolvedCredential.ts"

export async function authActionCredentialResolve(
  ctx: ActionCtx,
  credential: string,
): PromiseResult<ResolvedCredential> {
  const result = await ctx.runQuery(internal.auth.apiKeyCredentialResolveQuery, { credential })
  if (!result.success) return result
  if (result.data.kind !== "apiKey" || !result.data.expiresAt) return result
  if (Date.parse(result.data.expiresAt) > Date.now()) return result
  return createResultError("authActionCredentialResolve", "expired credential")
}
