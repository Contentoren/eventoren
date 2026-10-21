import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { valibotFieldToConvexValidator, valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"
import { organizerDashboardCodeKindSchema } from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import { organizerDashboardCodeDiscountTypeSchema } from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import { organizerDashboardVoucherStatusSchema } from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"
import { organizerDashboardVoucherValiditySchema } from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"

/**
 * Pricing tables of the organizer dashboard: automatic price phases
 * (time/quota), discount and access codes, and organization vouchers with an
 * atomic redemption ledger.
 *
 * Money is stored as integer cents and instants as UTC ISO strings; Berlin
 * calendar display is derived at read time. Registered in `convex/schema.ts`:
 * `...organizerDashboardPricingTables`.
 *
 * Per-phase sold counts are organizer-maintained corrections until the
 * canonical checkout reports phase sales; time-based switching resolves
 * purely from `endsAt` and needs no counter.
 */
export const organizerDashboardPricingTables = {
  organizerDashboardPricePhases: defineTable({
    orgId: vIdOrg,
    eventKey: v.string(),
    tierKey: v.string(),
    phaseKey: v.string(),
    name: v.string(),
    priceCents: v.number(),
    endsAt: v.optional(v.string()),
    quota: v.optional(v.number()),
    soldCount: v.number(),
    sortOrder: v.number(),
    archivedAt: v.optional(v.string()),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgIdAndEventKeyAndTierKey", ["orgId", "eventKey", "tierKey"])
    .index("tierScopeAndSortOrder", ["orgId", "eventKey", "tierKey", "sortOrder"]),
  organizerDashboardCodes: defineTable({
    orgId: vIdOrg,
    eventKey: v.string(),
    kind: valibotFieldToConvexValidator(organizerDashboardCodeKindSchema),
    code: v.string(),
    discountType: v.optional(valibotFieldToConvexValidator(organizerDashboardCodeDiscountTypeSchema)),
    discountValue: v.optional(v.number()),
    tierKeys: v.array(v.string()),
    maxTickets: v.optional(v.number()),
    usedTickets: v.number(),
    validFrom: v.optional(v.string()),
    validUntil: v.optional(v.string()),
    active: v.boolean(),
    note: v.optional(v.string()),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgIdAndEventKey", ["orgId", "eventKey"])
    .index("orgIdAndEventKeyAndCode", ["orgId", "eventKey", "code"]),
  organizerDashboardVouchers: defineTable({
    orgId: vIdOrg,
    code: v.string(),
    initialCents: v.number(),
    balanceCents: v.number(),
    validity: valibotFieldToConvexValidator(organizerDashboardVoucherValiditySchema),
    expiresAt: v.optional(v.string()),
    status: valibotFieldToConvexValidator(organizerDashboardVoucherStatusSchema),
    recipientName: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
    message: v.optional(v.string()),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgId", ["orgId"])
    .index("orgIdAndCode", ["orgId", "code"]),
  organizerDashboardVoucherRedemptions: defineTable({
    orgId: vIdOrg,
    voucherId: v.id("organizerDashboardVouchers"),
    code: v.string(),
    orderRef: v.string(),
    amountCents: v.number(),
    redeemedByUserId: v.id("users"),
    createdAt: v.string(),
  })
    //
    .index("voucherId", ["voucherId"])
    .index("orgId", ["orgId"]),
} as const
