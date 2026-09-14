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
    category: v.union(
      v.literal("konzerte"),
      v.literal("festivals"),
      v.literal("kultur"),
      v.literal("sport"),
      v.literal("reisen"),
    ),
    startsAt: v.string(),
    endsAt: v.string(),
    doorsAt: v.string(),
    venue: v.string(),
    city: v.string(),
    address: v.string(),
    organizer: v.string(),
    imageUrl: v.string(),
    imageAlt: v.string(),
    tags: v.array(v.string()),
    status: catalogEventStatusValidator,
    catalogVersion: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("eventKey", ["eventKey"])
    .index("statusAndStartsAt", ["status", "startsAt"]),

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
    sortOrder: v.number(),
    catalogVersion: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("eventId", ["eventId"])
    .index("eventIdAndTierKey", ["eventId", "tierKey"]),

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
} as const
