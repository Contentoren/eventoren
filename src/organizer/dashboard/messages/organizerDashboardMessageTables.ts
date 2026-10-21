import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { organizerDashboardMessageDeliveryStateSchema } from "#src/organizer/dashboard/messages/organizerDashboardMessageDeliveryStateSchema.ts"
import { valibotFieldToConvexValidator } from "#src/utils/convex/valibotToConvex.ts"

export const organizerDashboardMessageTables = {
  organizerDashboardMessages: defineTable({
    orgId: vIdOrg,
    eventKey: v.string(),
    kind: v.string(),
    audienceType: v.string(),
    audienceTierKeys: v.array(v.string()),
    subject: v.string(),
    body: v.string(),
    status: v.string(),
    scheduledAt: v.optional(v.string()),
    sentAt: v.optional(v.string()),
    recipientCount: v.number(),
    deliveryState: valibotFieldToConvexValidator(organizerDashboardMessageDeliveryStateSchema),
    deliveryAttempts: v.number(),
    deliveryLastAttemptAt: v.optional(v.string()),
    deliveryReason: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("orgIdAndEventKey", ["orgId", "eventKey"])
    .index("orgIdAndEventKeyAndStatus", ["orgId", "eventKey", "status"]),
  organizerDashboardMessageReminders: defineTable({
    orgId: vIdOrg,
    eventKey: v.string(),
    enabled: v.boolean(),
    hoursBefore: v.number(),
    directions: v.string(),
    calendar: v.boolean(),
    sentAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("orgIdAndEventKey", ["orgId", "eventKey"]),
} as const
