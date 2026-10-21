import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { valibotFieldToConvexValidator, valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"
import { organizerDashboardPayoutStatusSchema } from "../organizerDashboardFinanceFilterSchema.ts"

export const organizerDashboardFinanceTables = {
  organizerDashboardPayouts: defineTable({
    orgId: vIdOrg,
    eventKey: v.string(),
    amountCents: v.number(),
    status: valibotFieldToConvexValidator(organizerDashboardPayoutStatusSchema),
    note: v.optional(v.string()),
    decidedByUserId: v.id("users"),
    decidedAt: v.string(),
    paidAt: v.optional(v.string()),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgIdAndCreatedAt", ["orgId", "createdAt"])
    .index("orgIdAndEventKeyAndCreatedAt", ["orgId", "eventKey", "createdAt"]),
} as const
