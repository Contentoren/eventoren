import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"

export type CatalogSyncStateGetResult = {
  version: number
  status: "pending" | "synced" | "failed"
  syncedVersion: number | null
}

/**
 * Admin-only readonly view of the catalog sync state. The published catalog
 * version is only registered in Billing once the scheduled push marks this
 * version synced; the public event item masks that gap with max(), so E2E
 * publication readiness must poll this state instead of the event row.
 */
export const catalogSyncStateGetQuery = query({
  args: { token: v.string() },
  handler: async (ctx, args) => authQueryTokenToUserId(ctx, args, catalogSyncStateGetAuthorized),
})

async function catalogSyncStateGetAuthorized(
  ctx: QueryCtx,
  args: { userId: IdUser },
): PromiseResult<CatalogSyncStateGetResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const state = await ctx.db
    .query("catalogSyncStates")
    .withIndex("key", (q) => q.eq("key", "catalog"))
    .unique()
  if (!state) return createResult({ version: 0, status: "pending" as const, syncedVersion: null })
  return createResult({
    version: state.version,
    status: state.status,
    syncedVersion: state.syncedVersion ?? null,
  })
}
