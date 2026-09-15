import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogSyncScheduleFn } from "./catalogSyncScheduleFn.js"
import { catalogSyncSnapshotPayloadBytesCalculate } from "./catalogSyncSnapshotPayloadBytesCalculate.js"

export async function catalogSyncAdvanceFn(ctx: MutationCtx, userId: IdUser, now: string): PromiseResult<number> {
  const syncState = await ctx.db
    .query("catalogSyncStates")
    .withIndex("key", (q) => q.eq("key", "catalog"))
    .unique()
  const version = (syncState?.version ?? 0) + 1
  const snapshot = {
    version,
    status: "building" as const,
    eventCursor: undefined,
    nextChunkIndex: 0,
    eventCount: 0,
    chunkCount: 0,
    payloadBytes: catalogSyncSnapshotPayloadBytesCalculate(version, 0, 0),
    updatedAt: now,
  }

  if (!syncState) {
    await ctx.db.insert("catalogSyncStates", {
      key: "catalog",
      version,
      status: "pending",
      syncedDigest: undefined,
      attempts: 0,
      lastChangedByUserId: userId,
      updatedAt: now,
    })
    await ctx.db.insert("catalogSyncSnapshots", snapshot)
    await catalogSyncScheduleFn(ctx, version)
    return createResult(version)
  }

  await ctx.db.patch("catalogSyncStates", syncState._id, {
    version,
    status: "pending",
    attempts: 0,
    lastAttemptAt: undefined,
    lastError: undefined,
    lastChangedByUserId: userId,
    updatedAt: now,
  })
  await ctx.db.insert("catalogSyncSnapshots", snapshot)
  await catalogSyncScheduleFn(ctx, version)
  return createResult(version)
}
