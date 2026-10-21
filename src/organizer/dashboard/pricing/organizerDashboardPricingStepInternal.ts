import { v } from "convex/values"
import { internalMutation } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import {
  organizerDashboardPricingStepFn,
  type OrganizerDashboardPricingStepResult,
} from "./organizerDashboardPricingStepFn.ts"

export const organizerDashboardPricingStepInternal = internalMutation({
  args: {
    orgId: v.id("orgs"),
    feeRevision: v.number(),
    eventPageSize: v.optional(v.number()),
    tierPageSize: v.optional(v.number()),
  },
  handler: (ctx, args): PromiseResult<OrganizerDashboardPricingStepResult> =>
    organizerDashboardPricingStepFn(ctx, args),
})
