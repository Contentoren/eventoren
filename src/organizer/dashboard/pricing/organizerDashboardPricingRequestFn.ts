import { internal } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export type OrganizerDashboardPricingRequestResult = {
  feeRevision: number
  hasEvents: boolean
}

/**
 * Starts a fresh fee repricing revision and barrier for one organization.
 * Callers patch tax/fee/configuration first; this helper only bumps
 * feeRevision, sets pricingStatus (updating when owned events exist, ready
 * otherwise), and (re)creates the pricing job with cleared stable cursors so
 * a stale worker for a prior revision can never clear the new barrier.
 * Assumes the caller already authorized the actor; fails only when the
 * organization row is missing, which callers validate before any write.
 */
export async function organizerDashboardPricingRequestFn(
  ctx: MutationCtx,
  args: { orgId: Id<"orgs">; startedByUserId: Id<"users">; now?: string },
): PromiseResult<OrganizerDashboardPricingRequestResult> {
  const op = "organizerDashboardPricingRequestFn"
  const now = args.now ?? new Date().toISOString()
  const organization = await ctx.db
    .query("organizerDashboardOrganizations")
    .withIndex("orgId", (q) => q.eq("orgId", args.orgId))
    .unique()
  if (!organization) return createResultError(op, "Organization onboarding required")
  const probe = await ctx.db
    .query("catalogEvents")
    .withIndex("orgId", (q) => q.eq("orgId", args.orgId))
    .take(1)
  const hasEvents = probe.length > 0
  const feeRevision = (organization.feeRevision ?? 0) + 1
  await ctx.db.patch("organizerDashboardOrganizations", organization._id, {
    pricingStatus: hasEvents ? "updating" : "ready",
    feeRevision,
    updatedAt: now,
  })
  if (hasEvents) {
    const existingJob = await ctx.db
      .query("organizerDashboardPricingJobs")
      .withIndex("orgIdAndFeeRevision", (q) => q.eq("orgId", args.orgId).eq("feeRevision", feeRevision))
      .unique()
    if (existingJob) {
      await ctx.db.patch("organizerDashboardPricingJobs", existingJob._id, {
        status: "pending",
        eventCursor: undefined,
        activeEventId: undefined,
        tierCursor: undefined,
        cursorVersion: 1,
        processedEvents: 0,
        processedTiers: 0,
        updatedTiers: 0,
        startedByUserId: args.startedByUserId,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("organizerDashboardPricingJobs", {
        orgId: args.orgId,
        feeRevision,
        status: "pending",
        cursorVersion: 1,
        processedEvents: 0,
        processedTiers: 0,
        updatedTiers: 0,
        startedByUserId: args.startedByUserId,
        createdAt: now,
        updatedAt: now,
      })
    }
    await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
      orgId: args.orgId,
      feeRevision,
    })
  }
  return createResult({ feeRevision, hasEvents })
}
