import { v } from "convex/values"
import * as a from "valibot"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { apiKeyNameSchema } from "#src/auth/model/apiKeyNameSchema.ts"
import { authMutationCredentialToUserId } from "#src/utils/convex_backend/authMutationCredentialToUserId.ts"
import { createTokenValidator } from "#src/utils/convex_backend/createTokenValidator.ts"

const argsValidator = createTokenValidator({ id: v.id("authApiKeys"), name: v.string() })

export const apiKeyRenameMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args) => authMutationCredentialToUserId(ctx, args, apiKeyRenameMutationFn),
})

async function apiKeyRenameMutationFn(
  ctx: MutationCtx,
  args: { id: Id<"authApiKeys">; name: string; userId: IdUser },
): PromiseResult<null> {
  const parsedName = a.safeParse(apiKeyNameSchema, args.name)
  if (!parsedName.success) return createResultError("apiKeyRenameMutation", "Name must be 1–80 characters")

  const key = await ctx.db.get("authApiKeys", args.id)
  if (!key || key.userId !== args.userId) return createResultError("apiKeyRenameMutation", "API key not found")

  await ctx.db.patch("authApiKeys", key._id, { name: parsedName.output })
  return createResult(null)
}
