import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import { createResult } from "#result"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogPilatesImageBackfillCreate } from "./catalogPilatesImageBackfillCreate.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

/** Operator-invoked, exact-record backfill. Omit dryRun to preview without any writes. */
export const catalogPilatesImageBackfillInternalMutation = internalMutation({
  args: { userId: vIdUser, dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
    if (!admin.success) return admin

    const eventKey = "pilates-christmas-event-2027-final"
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
      .unique()
    if (!event) return createResult({ eventKey, outcome: "not-found" as const })

    const image = catalogPilatesImageBackfillCreate(event)
    if (!image) return createResult({ eventKey, outcome: "unchanged" as const })
    if (args.dryRun !== false) return createResult({ eventKey, outcome: "would-backfill" as const, ...image })

    const now = new Date().toISOString()
    const version = await catalogSyncAdvanceFn(ctx, args.userId, now)
    if (!version.success) return version
    const eventRevision = (event.eventRevision ?? 1) + 1
    await ctx.db.patch("catalogEvents", event._id, {
      ...image,
      catalogVersion: version.data,
      eventRevision,
      updatedAt: now,
    })
    console.info("Pilates catalog image backfilled", { eventKey, catalogVersion: version.data, eventRevision })
    return createResult({
      eventKey,
      outcome: "backfilled" as const,
      ...image,
      catalogVersion: version.data,
      eventRevision,
    })
  },
})
