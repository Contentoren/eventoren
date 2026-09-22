import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

const catalogTicketTierDeleteArgsValidator = v.object({
  eventKey: v.string(),
  tierKey: v.string(),
  token: v.string(),
})

export const catalogTicketTierDeleteMutation = mutation({
  args: catalogTicketTierDeleteArgsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogTicketTierDeleteAuthorizedFn),
})

async function catalogTicketTierDeleteAuthorizedFn(
  ctx: MutationCtx,
  args: Omit<typeof catalogTicketTierDeleteArgsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<{ tierKey: string; catalogVersion: number }> {
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult

  const op = "catalogTicketTierDeleteMutation"
  if (args.eventKey.trim().length === 0) return createResultError(op, "Event key is required")
  if (args.tierKey.trim().length === 0) return createResultError(op, "Tier key is required")

  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event) return createResultError(op, "Event not found")

  const tier = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", args.tierKey))
    .unique()
  if (!tier) return createResultError(op, "Ticket tier not found")
  if (tier.reserved + tier.sold > 0)
    return createResultError(op, "Ticket tiers with reserved or sold inventory cannot be deleted")

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const catalogVersion = versionResult.data
  await ctx.db.delete(tier._id)
  await ctx.db.patch("catalogEvents", event._id, { catalogVersion, updatedAt: now })

  return createResult({ tierKey: args.tierKey, catalogVersion })
}
