import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

const catalogTicketTierArgsValidator = v.object({
  eventKey: v.string(),
  tierKey: v.string(),
  name: v.string(),
  description: v.string(),
  priceCents: v.number(),
  feeCents: v.number(),
  capacity: v.number(),
  sortOrder: v.optional(v.number()),
  token: v.string(),
})

export const catalogTicketTierUpsertMutation = mutation({
  args: catalogTicketTierArgsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogTicketTierUpsertAuthorizedFn),
})

async function catalogTicketTierUpsertAuthorizedFn(
  ctx: MutationCtx,
  args: Omit<typeof catalogTicketTierArgsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<{ tierKey: string; catalogVersion: number }> {
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult

  const op = "catalogTicketTierUpsertMutation"
  if (args.eventKey.trim().length === 0) return createResultError(op, "Event key is required")
  if (args.tierKey.trim().length === 0) return createResultError(op, "Tier key is required")
  if (args.name.trim().length === 0) return createResultError(op, "Tier name is required")
  if (!Number.isInteger(args.priceCents) || args.priceCents < 0)
    return createResultError(op, "Price must be a non-negative integer")
  if (!Number.isInteger(args.feeCents) || args.feeCents < 0)
    return createResultError(op, "Fee must be a non-negative integer")
  if (!Number.isInteger(args.capacity) || args.capacity < 0)
    return createResultError(op, "Capacity must be a non-negative integer")
  if (args.sortOrder !== undefined && (!Number.isInteger(args.sortOrder) || args.sortOrder < 0))
    return createResultError(op, "Sort order must be a non-negative integer")

  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event) return createResultError(op, "Event not found")

  const existing = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", args.tierKey))
    .unique()
  const reserved = existing?.reserved ?? 0
  const sold = existing?.sold ?? 0
  if (args.capacity < reserved + sold) {
    return createResultError(op, "Capacity cannot be below reserved plus sold inventory")
  }

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const catalogVersion = versionResult.data
  const tierData = {
    eventId: event._id,
    tierKey: args.tierKey,
    name: args.name,
    description: args.description,
    priceCents: args.priceCents,
    feeCents: args.feeCents,
    capacity: args.capacity,
    reserved,
    sold,
    sortOrder: args.sortOrder ?? existing?.sortOrder ?? 0,
    catalogVersion,
    updatedAt: now,
  }

  if (existing) {
    await ctx.db.patch("catalogTicketTiers", existing._id, tierData)
  } else {
    await ctx.db.insert("catalogTicketTiers", { ...tierData, createdAt: now })
  }
  await ctx.db.patch("catalogEvents", event._id, { catalogVersion, updatedAt: now })

  return createResult({ tierKey: args.tierKey, catalogVersion })
}
