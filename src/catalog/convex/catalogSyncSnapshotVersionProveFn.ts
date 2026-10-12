import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { catalogSyncSnapshotFixtureKindFor } from "./catalogSyncSnapshotFixtureKindFor.js"

export type CatalogSyncSnapshotVersionProof = {
  version: number
  isTestBearing: boolean
  kinds: string[]
  eventKeys: string[]
  chunkIds: Id<"catalogSyncSnapshotChunks">[]
  chunkCount: number
}

const chunkTakeLimit = 10_001
const chunkBoundedLimit = 10_000

/**
 * Prove whether one snapshot version denormalizes fixture payload. Collects
 * the version's chunks with a bounded take (never paginate: only one paginate
 * per Convex function is allowed, and callers already paginate snapshots) and
 * classifies each chunked event JSON with the same approved exact markers as
 * live rows. Returns the chunk identities so the caller can delete wholly
 * without rescanning. Unparsable payloads fail the version for manual
 * reconciliation instead of silently deleting genuine data. Overflow fails
 * explicitly beyond the Billing event bound.
 */
export async function catalogSyncSnapshotVersionProveFn(
  ctx: MutationCtx | QueryCtx,
  input: { version: number; fixtureEventKey?: string },
): PromiseResult<CatalogSyncSnapshotVersionProof> {
  const op = "catalogSyncSnapshotVersionProveFn"
  const chunks = await ctx.db
    .query("catalogSyncSnapshotChunks")
    .withIndex("versionAndChunkIndex", (q) => q.eq("version", input.version))
    .order("asc")
    .take(chunkTakeLimit)
  if (chunks.length > chunkBoundedLimit)
    return createResultError(op, "Snapshot version exceeds the bounded chunk limit")
  const kinds = new Map<string, string>()
  const eventKeys: string[] = []
  const chunkIds: Id<"catalogSyncSnapshotChunks">[] = []
  let filterMatch = false
  for (const chunk of chunks) {
    chunkIds.push(chunk._id)
    if (input.fixtureEventKey && chunk.eventKey !== input.fixtureEventKey) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(chunk.payloadJson)
    } catch {
      return createResultError(op, "Snapshot payload could not be proven; retained")
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return createResultError(op, "Snapshot payload could not be proven; retained")
    const record = parsed as Record<string, unknown>
    const kind = catalogSyncSnapshotFixtureKindFor({
      eventKey: record.eventKey,
      title: record.title,
      organizer: record.organizer,
      description: record.description,
      imageUrl: record.imageUrl,
    })
    if (kind) {
      kinds.set(chunk.eventKey, kind)
      if (!eventKeys.includes(chunk.eventKey)) eventKeys.push(chunk.eventKey)
      if (input.fixtureEventKey && chunk.eventKey === input.fixtureEventKey) filterMatch = true
    }
  }
  const isTestBearing = input.fixtureEventKey ? filterMatch && eventKeys.length > 0 : eventKeys.length > 0
  return createResult({
    version: input.version,
    isTestBearing,
    kinds: [...kinds.values()],
    eventKeys,
    chunkIds,
    chunkCount: chunks.length,
  })
}
