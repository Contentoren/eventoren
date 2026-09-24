import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalMutation } from "#convex/_generated/server.js"
import { catalogSyncSnapshotPayloadBytesCalculate } from "./catalogSyncSnapshotPayloadBytesCalculate.js"

export const catalogSyncRefreshRequestMutation = internalMutation({
  args: { expectedVersion: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    if (!state || state.version !== args.expectedVersion)
      return { requested: false, currentVersion: state?.version ?? 0 }

    const requestedVersion = state.version + 1
    const now = new Date().toISOString()
    await ctx.db.patch("catalogSyncStates", state._id, {
      version: requestedVersion,
      status: "pending",
      attempts: 0,
      lastAttemptAt: undefined,
      lastError: undefined,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncSnapshots", {
      version: requestedVersion,
      status: "building",
      eventCursor: undefined,
      nextChunkIndex: 0,
      eventCount: 0,
      chunkCount: 0,
      payloadBytes: catalogSyncSnapshotPayloadBytesCalculate(requestedVersion, 0, 0),
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(0, internal.catalog.catalogSyncPushAction, { requestedVersion })
    return { requested: true, requestedVersion }
  },
})
