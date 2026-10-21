import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"

export const organizerDashboardGuestTables = {
  organizerDashboardGuestQuotas: defineTable({
    orgId: vIdOrg,
    eventKey: v.string(),
    name: v.string(),
    limit: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("orgIdAndEventKey", ["orgId", "eventKey"]),
  organizerDashboardGuests: defineTable({
    orgId: vIdOrg,
    eventKey: v.string(),
    quotaId: v.optional(v.id("organizerDashboardGuestQuotas")),
    name: v.string(),
    email: v.optional(v.string()),
    plusOnes: v.number(),
    note: v.optional(v.string()),
    orderId: v.optional(v.id("ticketOrders")),
    checkedInAt: v.optional(v.string()),
    entrance: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("orgIdAndEventKey", ["orgId", "eventKey"])
    .index("quotaId", ["quotaId"]),
} as const
