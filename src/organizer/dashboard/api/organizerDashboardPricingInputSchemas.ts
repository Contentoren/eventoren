import * as v from "valibot"
import {
  organizerDashboardCodeArchiveSchema,
  organizerDashboardCodeBulkCreateSchema,
  organizerDashboardCodeCreateSchema,
  organizerDashboardCodeKindSchema,
  organizerDashboardCodeListFilterSchema,
  organizerDashboardCodeUpdateSchema,
} from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import {
  organizerDashboardPhaseArchiveSchema,
  organizerDashboardPhaseListFilterSchema,
  organizerDashboardPhaseUpsertSchema,
} from "#src/organizer/dashboard/pricing/organizerDashboardPhaseSchema.ts"
import {
  organizerDashboardVoucherDeactivateSchema,
  organizerDashboardVoucherIssueSchema,
  organizerDashboardVoucherListFilterSchema,
  organizerDashboardVoucherRedeemSchema,
} from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and scope.
const page = {
  numItems: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)), 25),
  cursor: v.optional(v.nullable(v.string())),
  endCursor: v.optional(v.nullable(v.string())),
}

/** Strict, credential-free transport wrappers around the canonical pricing fields. */
export const organizerDashboardPricingInputSchemas = {
  phaseList: v.strictObject({ ...organizerDashboardPhaseListFilterSchema.entries }),
  phaseUpsert: v.strictObject({ ...organizerDashboardPhaseUpsertSchema.entries }),
  phaseArchive: v.strictObject({ ...organizerDashboardPhaseArchiveSchema.entries }),
  codeList: v.strictObject({
    ...organizerDashboardCodeListFilterSchema.entries,
    ...page,
  }),
  codeCreate: v.strictObject({
    orgId: organizerDashboardCodeCreateSchema.entries.orgId,
    eventKey: organizerDashboardCodeCreateSchema.entries.eventKey,
    kind: organizerDashboardCodeKindSchema,
    code: organizerDashboardCodeCreateSchema.entries.code,
    prefix: organizerDashboardCodeBulkCreateSchema.entries.prefix,
    count: v.optional(organizerDashboardCodeBulkCreateSchema.entries.count),
    discountType: organizerDashboardCodeCreateSchema.entries.discountType,
    discountValue: organizerDashboardCodeCreateSchema.entries.discountValue,
    tierKeys: organizerDashboardCodeCreateSchema.entries.tierKeys,
    maxTickets: organizerDashboardCodeCreateSchema.entries.maxTickets,
    validFrom: organizerDashboardCodeCreateSchema.entries.validFrom,
    validUntil: organizerDashboardCodeCreateSchema.entries.validUntil,
    note: organizerDashboardCodeCreateSchema.entries.note,
  }),
  codeUpdate: v.strictObject({ ...organizerDashboardCodeUpdateSchema.entries }),
  codeDelete: v.strictObject({ ...organizerDashboardCodeArchiveSchema.entries }),
  voucherList: v.strictObject({
    ...organizerDashboardVoucherListFilterSchema.entries,
    ...page,
  }),
  voucherIssue: v.strictObject({ ...organizerDashboardVoucherIssueSchema.entries }),
  voucherRedeem: v.strictObject({ ...organizerDashboardVoucherRedeemSchema.entries }),
  voucherDeactivate: v.strictObject({ ...organizerDashboardVoucherDeactivateSchema.entries }),
  payoutStatusUpdate: v.strictObject({
    orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
    payoutId: v.pipe(v.string(), v.trim(), v.minLength(1, "Cannot be empty")),
    status: v.picklist(["vorgemerkt", "ausgezahlt"]),
  }),
} as const
