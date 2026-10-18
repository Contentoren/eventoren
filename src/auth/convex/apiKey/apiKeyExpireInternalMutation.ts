import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import { nowIso } from "#utils/date/nowIso.js"

export const apiKeyExpireInternalMutation = internalMutation({
  args: { id: v.id("authApiKeys") },
  handler: async (ctx, args) => apiKeyExpireInternalMutationFn(ctx, args.id),
})

async function apiKeyExpireInternalMutationFn(ctx: MutationCtx, id: Id<"authApiKeys">): Promise<void> {
  const key = await ctx.db.get("authApiKeys", id)
  if (!key || key.revokedAt || key.expiredAt || !key.expiresAt) return
  if (Date.parse(key.expiresAt) > Date.now()) return
  await ctx.db.patch("authApiKeys", key._id, { expiredAt: nowIso() })
}
