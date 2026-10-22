import { internal } from "#convex/_generated/api.js"
import type { Doc } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { catalogSyncAdvanceFn } from "#src/catalog/convex/catalogSyncAdvanceFn.ts"
import { organizerDashboardTierFeeCompute } from "#src/organizer/dashboard/events/model/organizerDashboardTierFeeCompute.ts"
import { organizerDashboardPricingRevisionOf } from "./organizerDashboardPricingRevisionOf.ts"
import { organizerDashboardPricingTierPageSize } from "./organizerDashboardPricingTierPageSize.ts"
import { organizerDashboardPricingMaxPageSize } from "./organizerDashboardPricingMaxPageSize.ts"

export type OrganizerDashboardPricingStepStatus = "progress" | "done" | "superseded"

export type OrganizerDashboardPricingStepResult = {
  status: OrganizerDashboardPricingStepStatus
  feeRevision: number
  processedEvents: number
  processedTiers: number
  updatedTiers: number
  stepEventsVisited: number
  stepTiersVisited: number
}

const PRICING_CURSOR_VERSION = 1

function clampPageSize(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isSafeInteger(value)) return fallback
  return Math.min(organizerDashboardPricingMaxPageSize, Math.max(1, value))
}

/**
 * One bounded, idempotent step of the org fee repricing job. Each step runs at
 * most ONE native paginate: either a single stable event pick (orgId-only
 * index, implicit creation-time order) or a single bounded tier page for the
 * persisted active event. No gte/filter offset cursors, so no sentinel is
 * consumed and hasMore can never go false early.
 *
 * Phase A (no activeEventId): pick exactly one event on the stable index,
 * persist its id plus the event continueCursor, schedule the next step, and
 * return without touching tiers. Phase B (activeEventId set): read exactly
 * one native tier page for that event, reprice sellable tiers to the CURRENT
 * org fee, bump that event's catalogVersion+eventRevision on EVERY batch with
 * changes before continuing, then persist the tier continueCursor (or clear
 * the active event when the tier page isDone). Only an empty, isDone event
 * pick marks the job done and clears the barrier, and only when the stored
 * feeRevision still matches the org row. Superseded revisions return
 * "superseded" without touching rows. Events that vanished or moved to a
 * different org are skipped without tier writes.
 */
export async function organizerDashboardPricingStepFn(
  ctx: MutationCtx,
  args: {
    orgId: Doc<"organizerDashboardOrganizations">["orgId"]
    feeRevision: number
    eventPageSize?: number
    tierPageSize?: number
  },
): PromiseResult<OrganizerDashboardPricingStepResult> {
  const op = "organizerDashboardPricingStepFn"
  const tierPageSize = clampPageSize(args.tierPageSize, organizerDashboardPricingTierPageSize)
  const organization = await ctx.db
    .query("organizerDashboardOrganizations")
    .withIndex("orgId", (q) => q.eq("orgId", args.orgId))
    .unique()
  if (!organization) return createResultError(op, "Bitte schließe zuerst das Veranstalter-Onboarding ab.")
  if (organizerDashboardPricingRevisionOf(organization) !== args.feeRevision) {
    return createResult({
      status: "superseded",
      feeRevision: args.feeRevision,
      processedEvents: 0,
      processedTiers: 0,
      updatedTiers: 0,
      stepEventsVisited: 0,
      stepTiersVisited: 0,
    })
  }
  const job = await ctx.db
    .query("organizerDashboardPricingJobs")
    .withIndex("orgIdAndFeeRevision", (q) => q.eq("orgId", args.orgId).eq("feeRevision", args.feeRevision))
    .unique()
  if (!job) {
    return createResult({
      status: "done",
      feeRevision: args.feeRevision,
      processedEvents: 0,
      processedTiers: 0,
      updatedTiers: 0,
      stepEventsVisited: 0,
      stepTiersVisited: 0,
    })
  }
  if (job.status === "done") {
    return createResult({
      status: "done",
      feeRevision: args.feeRevision,
      processedEvents: job.processedEvents,
      processedTiers: job.processedTiers,
      updatedTiers: job.updatedTiers,
      stepEventsVisited: 0,
      stepTiersVisited: 0,
    })
  }

  const now = new Date().toISOString()
  if (job.cursorVersion !== PRICING_CURSOR_VERSION) {
    await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
      status: "running",
      eventCursor: undefined,
      activeEventId: undefined,
      tierCursor: undefined,
      cursorVersion: PRICING_CURSOR_VERSION,
      processedEvents: 0,
      processedTiers: 0,
      updatedTiers: 0,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
      orgId: args.orgId,
      feeRevision: args.feeRevision,
    })
    return createResult({
      status: "progress",
      feeRevision: args.feeRevision,
      processedEvents: 0,
      processedTiers: 0,
      updatedTiers: 0,
      stepEventsVisited: 0,
      stepTiersVisited: 0,
    })
  }

  await ctx.db.patch("organizerDashboardPricingJobs", job._id, { status: "running", updatedAt: now })

  if (job.activeEventId === undefined) {
    const pick = await ctx.db
      .query("catalogEvents")
      .withIndex("orgId", (q) => q.eq("orgId", args.orgId))
      .order("asc")
      .paginate({ cursor: job.eventCursor ?? null, numItems: 1 })
    const picked = pick.page[0]
    if (picked === undefined) {
      if (!pick.isDone) {
        await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
          status: "running",
          eventCursor: pick.continueCursor,
          updatedAt: now,
        })
        await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
          orgId: args.orgId,
          feeRevision: args.feeRevision,
        })
        return createResult({
          status: "progress",
          feeRevision: args.feeRevision,
          processedEvents: job.processedEvents,
          processedTiers: job.processedTiers,
          updatedTiers: job.updatedTiers,
          stepEventsVisited: 0,
          stepTiersVisited: 0,
        })
      }
      await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
        status: "done",
        eventCursor: pick.continueCursor,
        activeEventId: undefined,
        tierCursor: undefined,
        updatedAt: now,
      })
      const current = await ctx.db.get("organizerDashboardOrganizations", organization._id)
      if (current && organizerDashboardPricingRevisionOf(current) === args.feeRevision) {
        await ctx.db.patch("organizerDashboardOrganizations", organization._id, {
          pricingStatus: "ready",
          updatedAt: now,
        })
      }
      return createResult({
        status: "done",
        feeRevision: args.feeRevision,
        processedEvents: job.processedEvents,
        processedTiers: job.processedTiers,
        updatedTiers: job.updatedTiers,
        stepEventsVisited: 0,
        stepTiersVisited: 0,
      })
    }
    if (picked.orgId !== args.orgId) {
      await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
        status: "running",
        eventCursor: pick.continueCursor,
        processedEvents: job.processedEvents + 1,
        updatedAt: now,
      })
      await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
        orgId: args.orgId,
        feeRevision: args.feeRevision,
      })
      return createResult({
        status: "progress",
        feeRevision: args.feeRevision,
        processedEvents: job.processedEvents + 1,
        processedTiers: job.processedTiers,
        updatedTiers: job.updatedTiers,
        stepEventsVisited: 1,
        stepTiersVisited: 0,
      })
    }
    await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
      status: "running",
      eventCursor: pick.continueCursor,
      activeEventId: picked._id,
      tierCursor: undefined,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
      orgId: args.orgId,
      feeRevision: args.feeRevision,
    })
    return createResult({
      status: "progress",
      feeRevision: args.feeRevision,
      processedEvents: job.processedEvents,
      processedTiers: job.processedTiers,
      updatedTiers: job.updatedTiers,
      stepEventsVisited: 0,
      stepTiersVisited: 0,
    })
  }

  const activeEvent = await ctx.db.get("catalogEvents", job.activeEventId)
  if (activeEvent === null || activeEvent.orgId !== args.orgId) {
    await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
      status: "running",
      activeEventId: undefined,
      tierCursor: undefined,
      processedEvents: job.processedEvents + 1,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
      orgId: args.orgId,
      feeRevision: args.feeRevision,
    })
    return createResult({
      status: "progress",
      feeRevision: args.feeRevision,
      processedEvents: job.processedEvents + 1,
      processedTiers: job.processedTiers,
      updatedTiers: job.updatedTiers,
      stepEventsVisited: 1,
      stepTiersVisited: 0,
    })
  }

  const tierPick = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", activeEvent._id))
    .order("asc")
    .paginate({
      cursor: job.tierCursor ?? null,
      numItems: tierPageSize,
      maximumRowsRead: tierPageSize,
      maximumBytesRead: tierPageSize * 2048,
    })
  const sellable = activeEvent.status !== "archived" && activeEvent.deletedAt === undefined
  let processedTiers = job.processedTiers
  let updatedTiers = job.updatedTiers
  let stepTiersVisited = 0
  let eventTouched = false
  let catalogVersionForStep: number | null = null
  for (const tier of tierPick.page) {
    stepTiersVisited += 1
    processedTiers += 1
    if (!sellable || tier.archivedAt !== undefined) continue
    const expected = organizerDashboardTierFeeCompute({
      priceCents: tier.priceCents,
      fee: organization.fee,
    })
    if (tier.feeCents === expected) continue
    if (catalogVersionForStep === null) {
      const versionResult = await catalogSyncAdvanceFn(ctx, job.startedByUserId, now)
      if (!versionResult.success) return versionResult
      catalogVersionForStep = versionResult.data
    }
    await ctx.db.patch("catalogTicketTiers", tier._id, {
      feeCents: expected,
      catalogVersion: catalogVersionForStep,
      updatedAt: now,
    })
    updatedTiers += 1
    eventTouched = true
  }
  if (eventTouched && catalogVersionForStep !== null) {
    const fresh = await ctx.db.get("catalogEvents", activeEvent._id)
    if (fresh && fresh.orgId === args.orgId) {
      await ctx.db.patch("catalogEvents", activeEvent._id, {
        catalogVersion: catalogVersionForStep,
        eventRevision: (fresh.eventRevision ?? 1) + 1,
        updatedAt: now,
      })
    }
  }
  if (!tierPick.isDone) {
    await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
      status: "running",
      tierCursor: tierPick.continueCursor,
      processedTiers,
      updatedTiers,
      updatedAt: now,
    })
    await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
      orgId: args.orgId,
      feeRevision: args.feeRevision,
    })
    return createResult({
      status: "progress",
      feeRevision: args.feeRevision,
      processedEvents: job.processedEvents,
      processedTiers,
      updatedTiers,
      stepEventsVisited: 0,
      stepTiersVisited,
    })
  }
  await ctx.db.patch("organizerDashboardPricingJobs", job._id, {
    status: "running",
    activeEventId: undefined,
    tierCursor: undefined,
    processedEvents: job.processedEvents + 1,
    processedTiers,
    updatedTiers,
    updatedAt: now,
  })
  await ctx.scheduler.runAfter(0, internal.organizerDashboardPricing.organizerDashboardPricingStepInternal, {
    orgId: args.orgId,
    feeRevision: args.feeRevision,
  })
  return createResult({
    status: "progress",
    feeRevision: args.feeRevision,
    processedEvents: job.processedEvents + 1,
    processedTiers,
    updatedTiers,
    stepEventsVisited: 1,
    stepTiersVisited,
  })
}
