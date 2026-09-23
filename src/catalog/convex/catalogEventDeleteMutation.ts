import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

export const catalogEventDeleteMutation = mutation({
  args: { eventKey: v.string(), token: v.string() },
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogEventDeleteAuthorizedFn),
})

async function catalogEventDeleteAuthorizedFn(
  ctx: MutationCtx,
  args: { eventKey: string; userId: IdUser },
): PromiseResult<{ eventKey: string; catalogVersion: number }> {
  const authorization = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!authorization.success) return authorization
  const op = "catalogEventDeleteMutation"
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event || event.deletedAt) return createResultError(op, "Event not found")

  // Retain the event and its tiers for existing orders, tickets, and organizer history.
  const now = new Date().toISOString()
  const version = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!version.success) return version
  await ctx.db.patch("catalogEvents", event._id, {
    status: "archived",
    deletedAt: now,
    catalogVersion: version.data,
    updatedAt: now,
  })
  return createResult({ eventKey: event.eventKey, catalogVersion: version.data })
}
