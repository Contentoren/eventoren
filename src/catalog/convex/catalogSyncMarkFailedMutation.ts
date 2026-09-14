import { internalMutation } from "#convex/_generated/server.js"
import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"

export const catalogSyncMarkFailedMutation = internalMutation({
  args: {
    attemptedVersion: v.number(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!state) return { scheduled: false, currentVersion: 0 }
    if (state.version > args.attemptedVersion) {
      await ctx.scheduler.runAfter(0, internal.catalog.catalogSyncPushAction, {
        requestedVersion: state.version,
      })
      return { scheduled: false, currentVersion: state.version }
    }

    const attempts = state.attempts + 1
    const retryDelayMs = Math.min(60 * 60 * 1000, 1_000 * 2 ** Math.min(attempts - 1, 10))
    await ctx.db.patch("catalogSyncStates", state._id, {
      status: "failed",
      attempts,
      lastAttemptAt: Date.now(),
      lastError: args.errorMessage.slice(0, 500),
      updatedAt: new Date().toISOString(),
    })
    await ctx.scheduler.runAfter(retryDelayMs, internal.catalog.catalogSyncPushAction, {
      requestedVersion: args.attemptedVersion,
    })
    return { scheduled: true, currentVersion: state.version }
  },
})
