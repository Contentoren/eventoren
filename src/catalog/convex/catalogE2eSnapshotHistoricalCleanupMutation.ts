import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncSnapshotPayloadBytesCalculate } from "./catalogSyncSnapshotPayloadBytesCalculate.js"
import { catalogSyncScheduleFn } from "./catalogSyncScheduleFn.js"
import { catalogSyncSnapshotVersionProveFn } from "./catalogSyncSnapshotVersionProveFn.js"

const snapshotPageSize = 20

const argsValidator = v.object({
  token: v.string(),
  cursor: v.optional(v.string()),
})

export type CatalogE2eSnapshotHistoricalCleanupResult = {
  scannedSnapshots: number
  isDone: boolean
  continueCursor: string | null
  activeVersion: number
  cleanedVersions: {
    version: number
    kinds: string[]
    eventKeys: string[]
    chunkCount: number
    action: "deleted" | "rebuilt"
  }[]
  deletedChunks: number
  skippedVersions: { version: number; reason: string }[]
  externalArtifacts: "stripe-imap-pdf-reconciled-separately"
}

/**
 * Transactional batch deletion of derived snapshot versions that still
 * denormalize fixture payload. Each call processes one snapshot page and
 * re-derives present exact matches (same approved markers as live rows,
 * never a generic substring) so a retried cursor is idempotent. Obsolete
 * test-bearing versions are deleted wholly with all chunks; an affected
 * active version is emptied back to building and rescheduled for genuine
 * rebuild. Genuine live rows are never touched: only derived cache rows go.
 * Unbounded pages fail explicitly instead of silently reporting success.
 */
export const catalogE2eSnapshotHistoricalCleanupMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogE2eSnapshotHistoricalCleanupAuthorized),
})

async function catalogE2eSnapshotHistoricalCleanupAuthorized(
  ctx: MutationCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<CatalogE2eSnapshotHistoricalCleanupResult> {
  const op = "catalogE2eSnapshotHistoricalCleanupMutation"
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const now = new Date().toISOString()
  const state = await ctx.db
    .query("catalogSyncStates")
    .withIndex("key", (q) => q.eq("key", "catalog"))
    .unique()
  const activeVersion = state?.version ?? 0
  const batch = await ctx.db
    .query("catalogSyncSnapshots")
    .paginate({ cursor: args.cursor ?? null, numItems: snapshotPageSize })
  const cleanedVersions: CatalogE2eSnapshotHistoricalCleanupResult["cleanedVersions"] = []
  const skippedVersions: { version: number; reason: string }[] = []
  let deletedChunks = 0
  for (const snapshot of batch.page) {
    const proven = await catalogSyncSnapshotVersionProveFn(ctx, { version: snapshot.version })
    if (!proven.success) {
      skippedVersions.push({ version: snapshot.version, reason: proven.errorMessage })
      continue
    }
    if (!proven.data.isTestBearing) continue
    const current = await ctx.db
      .query("catalogSyncStates")
      .withIndex("key", (q) => q.eq("key", "catalog"))
      .unique()
    const currentActive = current?.version ?? 0
    if (snapshot.version !== currentActive) {
      for (const chunkId of proven.data.chunkIds) {
        await ctx.db.delete("catalogSyncSnapshotChunks", chunkId)
        deletedChunks += 1
      }
      await ctx.db.delete("catalogSyncSnapshots", snapshot._id)
      cleanedVersions.push({
        version: snapshot.version,
        kinds: proven.data.kinds,
        eventKeys: proven.data.eventKeys,
        chunkCount: proven.data.chunkCount,
        action: "deleted",
      })
      continue
    }
    for (const chunkId of proven.data.chunkIds) {
      await ctx.db.delete("catalogSyncSnapshotChunks", chunkId)
      deletedChunks += 1
    }
    await ctx.db.patch("catalogSyncSnapshots", snapshot._id, {
      status: "building",
      eventCursor: undefined,
      nextChunkIndex: 0,
      eventCount: 0,
      chunkCount: 0,
      payloadBytes: catalogSyncSnapshotPayloadBytesCalculate(snapshot.version, 0, 0),
      updatedAt: now,
    })
    await catalogSyncScheduleFn(ctx, snapshot.version)
    cleanedVersions.push({
      version: snapshot.version,
      kinds: proven.data.kinds,
      eventKeys: proven.data.eventKeys,
      chunkCount: proven.data.chunkCount,
      action: "rebuilt",
    })
  }
  if (cleanedVersions.length > 0 || skippedVersions.length > 0)
    console.info("E2E snapshot fixture page swept", {
      scannedSnapshots: batch.page.length,
      cleanedVersions: cleanedVersions.length,
      skippedVersions: skippedVersions.length,
      deletedChunks,
      isDone: batch.isDone,
    })
  if (batch.page.length >= snapshotPageSize && batch.isDone === false && !batch.continueCursor)
    return createResultError(op, "Snapshot sweep truncated; checkpoint retained")
  return createResult({
    scannedSnapshots: batch.page.length,
    isDone: batch.isDone,
    continueCursor: batch.continueCursor,
    activeVersion,
    cleanedVersions,
    deletedChunks,
    skippedVersions,
    externalArtifacts: "stripe-imap-pdf-reconciled-separately" as const,
  })
}
