import { v } from "convex/values"
import { internalQuery } from "#convex/_generated/server.js"
import { catalogSyncLimits } from "./catalogSyncLimits.js"

const snapshotCursorVersion = 1

type SnapshotCursor = {
  version: number
  catalogVersion: number
  sourceCursor: string
}

export const catalogSyncSnapshotQuery = internalQuery({
  args: {
    requestedVersion: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    requestedVersion: number
    catalogVersion: number
    eventCount: number
    payloadBytes: number
    events: readonly Record<string, unknown>[]
    isDone: boolean
    continueCursor: string
  } | null> => {
    const snapshot = await ctx.db
      .query("catalogSyncSnapshots")
      .withIndex("version", (q) => q.eq("version", args.requestedVersion))
      .unique()
    if (snapshot?.status !== "ready") return null

    const sourceCursor = snapshotCursorRead(args.cursor, snapshot.version)
    if (args.cursor !== undefined && sourceCursor === null) return null

    const page = await ctx.db
      .query("catalogSyncSnapshotChunks")
      .withIndex("versionAndChunkIndex", (q) => q.eq("version", args.requestedVersion))
      .order("asc")
      .paginate({
        cursor: sourceCursor,
        numItems: catalogSyncLimits.snapshotQueryPageSize,
        maximumRowsRead: catalogSyncLimits.snapshotQueryPageSize,
        maximumBytesRead: 4 * 1024 * 1024,
      })
    const events: Record<string, unknown>[] = []
    for (const chunk of page.page) {
      try {
        const payload = JSON.parse(chunk.payloadJson)
        if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null
        events.push(payload as Record<string, unknown>)
      } catch {
        return null
      }
    }

    return {
      requestedVersion: args.requestedVersion,
      catalogVersion: snapshot.version,
      eventCount: snapshot.eventCount,
      payloadBytes: snapshot.payloadBytes,
      events,
      isDone: page.isDone,
      continueCursor: JSON.stringify({
        version: snapshotCursorVersion,
        catalogVersion: snapshot.version,
        sourceCursor: page.continueCursor,
      } satisfies SnapshotCursor),
    }
  },
})

function snapshotCursorRead(cursor: string | undefined, catalogVersion: number): string | null {
  if (cursor === undefined) return null
  try {
    const parsed = JSON.parse(cursor) as Partial<SnapshotCursor>
    if (
      parsed.version !== snapshotCursorVersion ||
      parsed.catalogVersion !== catalogVersion ||
      typeof parsed.sourceCursor !== "string"
    )
      return null
    return parsed.sourceCursor
  } catch {
    return null
  }
}
