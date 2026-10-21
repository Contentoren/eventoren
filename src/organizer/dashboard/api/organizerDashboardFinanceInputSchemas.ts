import * as v from "valibot"
import { organizerDashboardFinanceOverviewFilterSchema } from "../finance/organizerDashboardFinanceFilterSchema.ts"
import { organizerDashboardPayoutListFilterSchema } from "../finance/organizerDashboardFinanceFilterSchema.ts"
import { organizerDashboardPayoutRecordSchema } from "../finance/organizerDashboardFinanceFilterSchema.ts"
import { organizerDashboardSettlementFilterSchema } from "../finance/organizerDashboardFinanceFilterSchema.ts"

// Transport IDs are nonempty strings. Convex validates canonical IDs and scope.
const page = {
  numItems: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50)), 25),
  cursor: v.optional(v.nullable(v.string())),
  endCursor: v.optional(v.nullable(v.string())),
}

/** Strict, credential-free transport wrappers around the canonical finance fields. */
export const organizerDashboardFinanceInputSchemas = {
  financeOverview: v.strictObject({
    orgId: organizerDashboardFinanceOverviewFilterSchema.entries.orgId,
    eventKey: organizerDashboardFinanceOverviewFilterSchema.entries.eventKey,
    fromDay: organizerDashboardFinanceOverviewFilterSchema.entries.fromDay,
    toDay: organizerDashboardFinanceOverviewFilterSchema.entries.toDay,
  }),
  settlementGet: v.strictObject({ ...organizerDashboardSettlementFilterSchema.entries }),
  payoutList: v.strictObject({
    orgId: organizerDashboardPayoutListFilterSchema.entries.orgId,
    eventKey: organizerDashboardPayoutListFilterSchema.entries.eventKey,
    status: organizerDashboardPayoutListFilterSchema.entries.status,
    ...page,
  }),
  payoutRecord: v.strictObject({ ...organizerDashboardPayoutRecordSchema.entries }),
} as const
