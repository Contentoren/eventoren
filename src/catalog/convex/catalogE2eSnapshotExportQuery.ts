import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"

const argsValidator = v.object({
  token: v.string(),
  requestedVersion: v.number(),
  cursor: v.optional(v.string()),
})

export type CatalogE2eSnapshotExportResult = {
  requestedVersion: number
  catalogVersion: number
  eventCount: number
  payloadBytes: number
  events: readonly Record<string, unknown>[]
  isDone: boolean
  continueCursor: string
} | null

/**
 * Admin-only public export wrapper around the internal sync snapshot pager.
 * The internal query is unreachable over HTTP for the admin app token, so
 * the success-cleanup reader drains the ready export through this query.
 * Returns null data while the requested version is still building (not
 * ready), mirroring the internal query; only admin callers may read it.
 */
export const catalogE2eSnapshotExportQuery = query({
  args: argsValidator,
  handler: async (ctx, args) => authQueryTokenToUserId(ctx, args, catalogE2eSnapshotExportAuthorized),
})

async function catalogE2eSnapshotExportAuthorized(
  ctx: QueryCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<CatalogE2eSnapshotExportResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const page = await ctx.runQuery(internal.catalog.catalogSyncSnapshotQuery, {
    requestedVersion: args.requestedVersion,
    ...(args.cursor !== undefined ? { cursor: args.cursor } : {}),
  })
  return createResult(page)
}
