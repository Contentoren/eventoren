import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationCredentialToUserId } from "#src/utils/convex_backend/authMutationCredentialToUserId.ts"
import { createTokenValidator } from "#src/utils/convex_backend/createTokenValidator.ts"
import { nowIso } from "#utils/date/nowIso.js"

const argsValidator = createTokenValidator({ id: v.id("authApiKeys") })

export const apiKeyRevokeMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args) => authMutationCredentialToUserId(ctx, args, apiKeyRevokeMutationFn),
})

async function apiKeyRevokeMutationFn(
  ctx: MutationCtx,
  args: { id: Id<"authApiKeys">; userId: IdUser },
): PromiseResult<null> {
  const key = await ctx.db.get("authApiKeys", args.id)
  if (!key || key.userId !== args.userId) return createResultError("apiKeyRevokeMutation", "API key not found")
  if (!key.revokedAt) await ctx.db.patch("authApiKeys", key._id, { revokedAt: nowIso() })
  return createResult(null)
}
