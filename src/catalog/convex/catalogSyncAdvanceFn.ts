import type { MutationCtx } from "#convex/_generated/server.js"
import { catalogSyncScheduleFn } from "./catalogSyncScheduleFn.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"

export async function catalogSyncAdvanceFn(ctx: MutationCtx, userId: IdUser, now: string): PromiseResult<number> {
  const syncState = await ctx.db
    .query("catalogSyncStates")
    .withIndex("key", (q) => q.eq("key", "catalog"))
    .unique()
  const version = (syncState?.version ?? 0) + 1

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
  await catalogSyncScheduleFn(ctx, version)
  return createResult(version)
}
