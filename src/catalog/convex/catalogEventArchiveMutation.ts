import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogEventArchiveInputSchema } from "../catalogEventArchiveInputSchema.ts"
import { catalogEventArchivePatchCreate } from "../catalogEventArchivePatchCreate.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

export const catalogEventArchiveMutation = mutation({
  args: {
    ...valibotToConvex(catalogEventArchiveInputSchema.entries),
    token: valibotToConvex({ token: catalogEventArchiveInputSchema.entries.token }).token,
  },
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogEventArchiveAuthorizedFn),
})

async function catalogEventArchiveAuthorizedFn(
  ctx: MutationCtx,
  args: { eventKey: string; userId: IdUser },
): PromiseResult<{ eventKey: string; catalogVersion: number; eventRevision: number }> {
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult
  const op = "catalogEventArchiveMutation"
  if (args.eventKey.trim().length === 0) return createResultError(op, "Event key is required")
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event || event.deletedAt) return createResultError(op, "Event not found")
  if (event.status === "archived") {
    const eventRevision = event.eventRevision ?? 1
    if (event.eventRevision === undefined) await ctx.db.patch("catalogEvents", event._id, { eventRevision })
    return createResult({ eventKey: event.eventKey, catalogVersion: event.catalogVersion, eventRevision })
  }

  // Archive changes lifecycle visibility only: status flips to archived while the
  // event, its tiers and all order/ticket/payment history stay untouched. Unlike
  // the legacy soft-delete, no deletedAt marker is written.
  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const patch = catalogEventArchivePatchCreate({
    catalogVersion: versionResult.data,
    eventRevision: event.eventRevision ?? 1,
    now,
  })
  await ctx.db.patch("catalogEvents", event._id, patch)
  return createResult({
    eventKey: event.eventKey,
    catalogVersion: patch.catalogVersion,
    eventRevision: patch.eventRevision,
  })
}
