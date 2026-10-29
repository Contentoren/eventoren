import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogEventDuplicateInputSchema } from "../catalogEventDuplicateInputSchema.ts"
import { catalogEventDuplicatePrepareCreate } from "../catalogEventDuplicatePrepareCreate.ts"
import { catalogEventDuplicateTierLimit } from "../catalogEventDuplicateTierLimit.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

export const catalogEventDuplicateMutation = mutation({
  args: {
    ...valibotToConvex(catalogEventDuplicateInputSchema.entries),
    token: valibotToConvex({ token: catalogEventDuplicateInputSchema.entries.token }).token,
  },
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogEventDuplicateAuthorizedFn),
})

async function catalogEventDuplicateAuthorizedFn(
  ctx: MutationCtx,
  args: { eventKey: string; userId: IdUser },
): PromiseResult<{ eventKey: string; catalogVersion: number; eventRevision: number }> {
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult
  const op = "catalogEventDuplicateMutation"
  if (args.eventKey.trim().length === 0) return createResultError(op, "Event key is required")
  const source = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!source || (source.deletedAt && source.status !== "archived")) return createResultError(op, "Event not found")

  // Active tier configuration only: archived tiers stay with the source. One row
  // over the duplicate cap so oversized sources fail explicitly before any write.
  const sourceTiers = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", source._id).eq("archivedAt", undefined))
    .take(catalogEventDuplicateTierLimit + 1)
  const now = new Date().toISOString()
  const prepared = catalogEventDuplicatePrepareCreate({
    event: source,
    tiers: sourceTiers,
    now,
    random: Math.random,
    nowMs: Date.now(),
  })
  if (!prepared.success) return prepared
  const duplicate = prepared.data
  const keyTaken = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", duplicate.eventKey))
    .unique()
  if (keyTaken) return createResultError(op, "Event could not be duplicated, please retry")

  // Single mutation: the draft event and all its tiers commit atomically, so a
  // partial copy can never persist.
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const catalogVersion = versionResult.data
  const eventId = await ctx.db.insert("catalogEvents", { ...duplicate.event, catalogVersion })
  for (const tier of duplicate.tiers) {
    await ctx.db.insert("catalogTicketTiers", { eventId, ...tier, catalogVersion })
  }
  return createResult({ eventKey: duplicate.eventKey, catalogVersion, eventRevision: 1 })
}
