import { defineTable } from "convex/server"
import { v } from "convex/values"

export const organizerDashboardOrderTables = {
  organizerDashboardOrderNotes: defineTable({
    orgId: v.id("orgs"),
    orderId: v.id("ticketOrders"),
    eventKey: v.string(),
    authorUserId: v.id("users"),
    text: v.string(),
    createdAt: v.string(),
  }).index("orderIdAndCreatedAt", ["orderId", "createdAt"]),
  organizerDashboardOrderAudit: defineTable({
    orgId: v.id("orgs"),
    orderId: v.id("ticketOrders"),
    eventKey: v.string(),
    actorUserId: v.id("users"),
    at: v.string(),
    action: v.union(
      v.literal("note_added"),
      v.literal("note_deleted"),
      v.literal("buyer_contact_updated"),
      v.literal("participant_updated"),
      v.literal("refund_requested"),
      v.literal("refund_status_checked"),
      v.literal("invoice_status_checked"),
      v.literal("invoice_resent"),
      v.literal("invoice_pdf_downloaded"),
    ),
  }).index("orderIdAndAt", ["orderId", "at"]),
} as const
