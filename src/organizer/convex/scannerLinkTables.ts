import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"

export const scannerLinkTables = {
  scannerLinks: defineTable({
    code: v.string(),
    name: v.string(),
    role: v.union(v.literal("organizer"), v.literal("helper")),
    eventKeys: v.array(v.string()),
    createdByUserId: v.optional(vIdUser),
    parentId: v.optional(v.id("scannerLinks")),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("code", ["code"])
    .index("roleAndCreatedAt", ["role", "createdAt"])
    .index("parentIdAndCreatedAt", ["parentId", "createdAt"]),
} as const
