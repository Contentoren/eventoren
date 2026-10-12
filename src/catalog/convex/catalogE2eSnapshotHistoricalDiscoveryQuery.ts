import { v } from "convex/values"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncSnapshotVersionProveFn } from "./catalogSyncSnapshotVersionProveFn.js"

const snapshotPageSize = 50

const argsValidator = v.object({
  token: v.string(),
  cursor: v.optional(v.string()),
})

export type CatalogE2eSnapshotHistoricalDiscoveryResult = {
  scannedSnapshots: number
  isDone: boolean
  continueCursor: string | null
  candidates: { version: number; kind: string; eventKey: string; chunkCount: number }[]
  activeVersion: number
}

/**
 * Read-only pre-deletion inventory of derived snapshot versions that still
 * denormalize fixture payload. Persist the drained versionIDs to the cleanup
 * ledger BEFORE any snapshot deletion so a lost mutation response cannot
 * orphan evidence. Shape only reports exact test-bearing versions (same
 * approved markers as live rows, never a generic substring); ownership proof
 * and deletion stay with the cleanup mutation which re-derives present
 * matches transactionally. Full pagination drains every version; unbounded
 * tables fail instead of silently reporting success.
 */
export const catalogE2eSnapshotHistoricalDiscoveryQuery = query({
  args: argsValidator,
  handler: async (ctx, args) => authQueryTokenToUserId(ctx, args, catalogE2eSnapshotHistoricalDiscoveryAuthorized),
})

async function catalogE2eSnapshotHistoricalDiscoveryAuthorized(
  ctx: QueryCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<CatalogE2eSnapshotHistoricalDiscoveryResult> {
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const state = await ctx.db
    .query("catalogSyncStates")
    .withIndex("key", (q) => q.eq("key", "catalog"))
    .unique()
  const activeVersion = state?.version ?? 0
  const batch = await ctx.db
    .query("catalogSyncSnapshots")
    .paginate({ cursor: args.cursor ?? null, numItems: snapshotPageSize })
  const candidates: CatalogE2eSnapshotHistoricalDiscoveryResult["candidates"] = []
  for (const snapshot of batch.page) {
    const proven = await catalogSyncSnapshotVersionProveFn(ctx, { version: snapshot.version })
    if (!proven.success) continue
    if (!proven.data.isTestBearing) continue
    for (const eventKey of proven.data.eventKeys) {
      const kind = proven.data.kinds[proven.data.eventKeys.indexOf(eventKey)] ?? "ticket-e2e"
      candidates.push({ version: snapshot.version, kind, eventKey, chunkCount: proven.data.chunkCount })
    }
  }
  return createResult({
    scannedSnapshots: batch.page.length,
    isDone: batch.isDone,
    continueCursor: batch.continueCursor,
    candidates,
    activeVersion,
  })
}
