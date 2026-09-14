import { internalMutation } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { v } from "convex/values"

export const catalogSyncRescheduleMutation = internalMutation({
  args: {
    attemptedVersion: v.number(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!state) return { scheduled: false }
    if (state.version !== args.attemptedVersion) {
      await ctx.scheduler.runAfter(0, internal.catalog.catalogSyncPushAction, {
        requestedVersion: state.version,
      })
      return { scheduled: false }
    }
    await ctx.db.patch("catalogSyncStates", state._id, {
      status: "pending",
      lastAttemptAt: Date.now(),
      lastError: args.errorMessage.slice(0, 500),
      updatedAt: new Date().toISOString(),
    })
    await ctx.scheduler.runAfter(60 * 1000, internal.catalog.catalogSyncPushAction, {
      requestedVersion: state.version,
    })
    return { scheduled: true }
  },
})
