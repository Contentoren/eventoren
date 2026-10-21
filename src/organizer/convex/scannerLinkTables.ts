import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"

export const scannerLinkTables = {
  scannerLinks: defineTable({
    code: v.string(),
    name: v.string(),
    role: v.union(v.literal("organizer"), v.literal("helper")),
    eventKeys: v.array(v.string()),
    // Server-computed ownership snapshot per event key at link creation or
    // explicit admin migration reapproval (never client-supplied). Values are
    // the canonical org id, or null for events unowned at snapshot time.
    // Absent on legacy links, which keep working for still-unowned events.
    eventOrgIds: v.optional(v.record(v.string(), v.union(v.id("orgs"), v.null()))),
    createdByUserId: v.optional(vIdUser),
    parentId: v.optional(v.id("scannerLinks")),
    // Optional entrance label for dashboard-created helper links (e.g.
    // "Haupteingang"). Display only; authorization still covers eventKeys.
    entrance: v.optional(v.string()),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("code", ["code"])
    .index("roleAndCreatedAt", ["role", "createdAt"])
    .index("parentIdAndCreatedAt", ["parentId", "createdAt"]),
} as const
