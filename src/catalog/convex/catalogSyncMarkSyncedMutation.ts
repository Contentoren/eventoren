import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"

export const catalogSyncMarkSyncedMutation = internalMutation({
  args: {
    attemptedVersion: v.number(),
    catalogDigest: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!state) return { accepted: false, currentVersion: 0 }
    if (state.version !== args.attemptedVersion) {
      if (state.version > args.attemptedVersion)
        await ctx.scheduler.runAfter(0, internal.catalog.catalogSyncPushAction, {
          requestedVersion: state.version,
        })
      return { accepted: false, currentVersion: state.version }
    }
    await ctx.db.patch("catalogSyncStates", state._id, {
      status: "synced",
      syncedVersion: args.attemptedVersion,
      syncedDigest: args.catalogDigest,
      attempts: 0,
      lastAttemptAt: Date.now(),
      lastError: undefined,
      updatedAt: new Date().toISOString(),
    })
    return { accepted: true, currentVersion: state.version }
  },
})
