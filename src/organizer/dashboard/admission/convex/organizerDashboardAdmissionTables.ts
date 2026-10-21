import { defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * Admission scan log: every manual or helper scan attempt with entrance and
 * machine-readable outcome, including rejected reasons. Never PII beyond the
 * ticket code already shown to the scanner.
 */
export const organizerDashboardAdmissionTables = {
  organizerDashboardAdmissionScans: defineTable({
    orgId: v.id("orgs"),
    eventKey: v.string(),
    ticketId: v.optional(v.id("ticketIssued")),
    ticketCode: v.string(),
    entrance: v.string(),
    action: v.union(v.literal("checkin"), v.literal("reset")),
    result: v.union(
      v.literal("ok"),
      v.literal("doppelt"),
      v.literal("falsches-event"),
      v.literal("unbekannt"),
      v.literal("storniert"),
      v.literal("unbezahlt"),
    ),
    reason: v.optional(v.string()),
    actorUserId: v.optional(v.string()),
    at: v.string(),
  })
    .index("eventKeyAndAt", ["eventKey", "at"])
    .index("orgIdAndAt", ["orgId", "at"]),
} as const
