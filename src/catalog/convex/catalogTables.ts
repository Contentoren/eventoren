import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"

const catalogEventStatusValidator = v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))

export const catalogTables = {
  catalogEvents: defineTable({
    eventKey: v.string(),
    title: v.string(),
    subtitle: v.string(),
    description: v.string(),
    category: v.string(),
    startsAt: v.string(),
    endsAt: v.string(),
    doorsAt: v.string(),
    venue: v.string(),
    city: v.string(),
    address: v.string(),
    organizer: v.string(),
    imageUrl: v.string(),
    imageVariants: v.optional(
      v.object({
        assetId: v.string(),
        detail: v.string(),
        card: v.string(),
        organizer: v.string(),
      }),
    ),
    imageAlt: v.string(),
    tags: v.array(v.string()),
    status: catalogEventStatusValidator,
    catalogVersion: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("eventKey", ["eventKey"])
    .index("startsAt", ["startsAt"])
    .index("statusAndStartsAt", ["status", "startsAt"]),

  catalogImageStages: defineTable({
    ownerId: vIdUser,
    filename: v.string(),
    mediaType: v.string(),
    byteSize: v.number(),
    storageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("pending"), v.literal("registered"), v.literal("processing")),
    expiresAt: v.number(),
  }).index("storageId", ["storageId"]),

  catalogTicketTiers: defineTable({
    eventId: v.id("catalogEvents"),
    tierKey: v.string(),
    name: v.string(),
    description: v.string(),
    priceCents: v.number(),
    feeCents: v.number(),
    capacity: v.number(),
    reserved: v.number(),
    sold: v.number(),
    archivedAt: v.optional(v.string()),
    sortOrder: v.number(),
    catalogVersion: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("eventId", ["eventId"])
    .index("eventIdAndArchivedAt", ["eventId", "archivedAt", "tierKey"])
    .index("eventIdAndTierKey", ["eventId", "tierKey"]),

  catalogHiddenCategories: defineTable({
    category: v.string(),
    hiddenAt: v.string(),
    hiddenByUserId: vIdUser,
  }).index("category", ["category"]),

  catalogSyncStates: defineTable({
    key: v.literal("catalog"),
    version: v.number(),
    status: v.union(v.literal("pending"), v.literal("synced"), v.literal("failed")),
    syncedVersion: v.optional(v.number()),
    syncedDigest: v.optional(v.string()),
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    lastChangedByUserId: vIdUser,
    updatedAt: v.string(),
  }).index("key", ["key"]),

  catalogSyncSnapshots: defineTable({
    version: v.number(),
    status: v.union(v.literal("building"), v.literal("ready")),
    eventCursor: v.optional(v.string()),
    nextChunkIndex: v.number(),
    eventCount: v.number(),
    chunkCount: v.number(),
    payloadBytes: v.number(),
    updatedAt: v.string(),
  }).index("version", ["version"]),

  catalogSyncSnapshotChunks: defineTable({
    version: v.number(),
    chunkIndex: v.number(),
    eventKey: v.string(),
    payloadJson: v.string(),
  }).index("versionAndChunkIndex", ["version", "chunkIndex"]),
} as const
