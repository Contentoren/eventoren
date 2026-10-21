import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { valibotFieldToConvexValidator, valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"
import { organizerDashboardAdminAuditActionSchema } from "#src/organizer/dashboard/admin/organizerDashboardAdminAuditActionSchema.ts"
import { organizerDashboardAdminAuditAreaSchema } from "#src/organizer/dashboard/admin/organizerDashboardAdminAuditAreaSchema.ts"
import { organizerDashboardOrganizationFeeSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationFeeSchema.ts"
import { organizerDashboardOrganizationKindSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationKindSchema.ts"
import { organizerDashboardOrganizationStatusSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationStatusSchema.ts"
import { organizerDashboardOrganizationTaxSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationTaxSchema.ts"

export const organizerDashboardTables = {
  organizerDashboardOrganizations: defineTable({
    orgId: vIdOrg,
    status: valibotFieldToConvexValidator(organizerDashboardOrganizationStatusSchema),
    profile: v.object({
      name: v.string(),
      slug: v.string(),
      kind: valibotFieldToConvexValidator(organizerDashboardOrganizationKindSchema),
      contact: v.optional(
        v.object({
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
        }),
      ),
      imprint: v.optional(v.string()),
    }),
    bank: v.optional(
      v.object({
        iban: v.string(),
        holder: v.string(),
      }),
    ),
    tax: valibotFieldToConvexValidator(organizerDashboardOrganizationTaxSchema),
    fee: valibotFieldToConvexValidator(organizerDashboardOrganizationFeeSchema),
    contracts: v.object({
      termsRevision: v.optional(v.string()),
      dpaRevision: v.optional(v.string()),
      termsConsentedAt: v.optional(v.string()),
      dpaConsentedAt: v.optional(v.string()),
      consentedByUserId: v.optional(v.id("users")),
      termsAcceptedAt: v.optional(v.string()),
      dpaAcceptedAt: v.optional(v.string()),
    }),
    configurationConfirmed: v.boolean(),
    configuredAt: v.optional(v.string()),
    blockReason: v.optional(v.string()),
    pricingStatus: v.optional(v.union(v.literal("ready"), v.literal("updating"))),
    feeRevision: v.optional(v.number()),
    ...valibotToConvex(fieldsSchemaCreatedAtUpdatedAt),
  })
    //
    .index("orgId", ["orgId"])
    .index("slug", ["profile.slug"])
    .index("status", ["status"]),
  organizerDashboardPricingJobs: defineTable({
    orgId: vIdOrg,
    feeRevision: v.number(),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("done")),
    eventCursor: v.optional(v.string()),
    activeEventId: v.optional(v.id("catalogEvents")),
    tierCursor: v.optional(v.string()),
    cursorVersion: v.optional(v.number()),
    processedEvents: v.number(),
    processedTiers: v.number(),
    updatedTiers: v.number(),
    startedByUserId: v.id("users"),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    //
    .index("orgIdAndFeeRevision", ["orgId", "feeRevision"]),
  organizerDashboardAudit: defineTable({
    orgId: vIdOrg,
    actorUserId: v.id("users"),
    area: valibotFieldToConvexValidator(organizerDashboardAdminAuditAreaSchema),
    action: valibotFieldToConvexValidator(organizerDashboardAdminAuditActionSchema),
    note: v.optional(v.string()),
    at: v.string(),
  })
    //
    .index("orgIdAt", ["orgId", "at"]),
} as const
