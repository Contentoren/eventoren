import type { MutationCtx } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"

export async function catalogSyncScheduleFn(ctx: MutationCtx, requestedVersion: number): Promise<void> {
  await ctx.scheduler.runAfter(0, internal.catalog.catalogSyncPushAction, { requestedVersion })
}
