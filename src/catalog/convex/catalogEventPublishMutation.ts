import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

export const catalogEventPublishMutation = mutation({
  args: { eventKey: v.string(), token: v.string() },
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogEventPublishAuthorizedFn),
})

async function catalogEventPublishAuthorizedFn(
  ctx: MutationCtx,
  args: { eventKey: string; userId: IdUser },
): PromiseResult<{ eventKey: string; catalogVersion: number; eventRevision: number }> {
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult
  const op = "catalogEventPublishMutation"
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event || event.deletedAt) return createResultError(op, "Event not found")
  if (event.status === "published") {
    const eventRevision = event.eventRevision ?? 1
    if (event.eventRevision === undefined) await ctx.db.patch("catalogEvents", event._id, { eventRevision })
    return createResult({ eventKey: event.eventKey, catalogVersion: event.catalogVersion, eventRevision })
  }

  const tier = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
    .first()
  if (!tier) return createResultError(op, "Published events need a ticket tier")

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  await ctx.db.patch("catalogEvents", event._id, {
    status: "published",
    catalogVersion: versionResult.data,
    eventRevision: (event.eventRevision ?? 1) + 1,
    updatedAt: now,
  })
  return createResult({
    eventKey: event.eventKey,
    catalogVersion: versionResult.data,
    eventRevision: (event.eventRevision ?? 1) + 1,
  })
}
