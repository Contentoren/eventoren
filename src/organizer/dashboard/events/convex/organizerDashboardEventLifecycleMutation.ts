import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogSyncAdvanceFn } from "#src/catalog/convex/catalogSyncAdvanceFn.ts"
import type { OrganizerDashboardEventSummary } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { organizerDashboardEventSummaryCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardEventAuthGet } from "./organizerDashboardEventAuthGet.ts"
import { organizerDashboardEventLoad } from "./organizerDashboardEventLoad.ts"

const organizerDashboardEventLifecycleValidator = v.object({
  orgId: v.id("orgs"),
  eventKey: v.string(),
  token: v.string(),
})

function organizerDashboardEventPublishValidate(
  event: {
    title: string
    startsAt: string
    endsAt: string
    imageUrl: string
    imageAlt: string
    venue: string
    city: string
  },
  tierActiveCount: number,
  organizationStatus: string,
): Result<null> {
  const op = "organizerDashboardEventPublishMutation"
  if (event.title.trim().length === 0) return createResultError(op, "Title is required for publishing")
  if (Number.isNaN(Date.parse(event.startsAt)) || Number.isNaN(Date.parse(event.endsAt))) {
    return createResultError(op, "Start and end must be valid dates for publishing")
  }
  if (Date.parse(event.endsAt) <= Date.parse(event.startsAt)) {
    return createResultError(op, "End time must be after start time")
  }
  if (event.venue.trim().length === 0 || event.city.trim().length === 0) {
    return createResultError(op, "Venue and city are required for publishing")
  }
  if (event.imageUrl.trim().length === 0) return createResultError(op, "Cover image is required for publishing")
  if (event.imageAlt.trim().length === 0) {
    return createResultError(op, "Image alternative text is required for publishing")
  }
  if (tierActiveCount === 0) return createResultError(op, "At least one ticket tier is required for publishing")
  if (organizationStatus !== "aktiv") return createResultError(op, "Organization must be active for publishing")
  return createResult(null)
}

export const organizerDashboardEventPublishMutation = mutation({
  args: organizerDashboardEventLifecycleValidator,
  handler: (ctx, args): PromiseResult<OrganizerDashboardEventSummary> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, eventKey }) =>
      organizerDashboardEventPublishAuthorizedFn(mutationCtx, { userId, orgId, eventKey }),
    ),
})

async function organizerDashboardEventPublishAuthorizedFn(
  ctx: MutationCtx,
  args: { userId: IdUser; orgId: Id<"orgs">; eventKey: string },
): PromiseResult<OrganizerDashboardEventSummary> {
  const op = "organizerDashboardEventPublishMutation"
  const authorization = await organizerDashboardEventAuthGet(ctx, args.userId, args.orgId, "events.bearbeiten")
  if (!authorization.success) return authorization
  const eventResult = await organizerDashboardEventLoad(ctx, authorization.data.orgId, args.eventKey)
  if (!eventResult.success) return eventResult
  const event = eventResult.data
  if (event.status === "published") return createResult(organizerDashboardEventSummaryCreate(event))
  if (event.status === "archived") return createResultError(op, "Archived events cannot be published again")

  const firstTier = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", event._id).eq("archivedAt", undefined))
    .first()
  const readiness = organizerDashboardEventPublishValidate(
    event,
    firstTier === null ? 0 : 1,
    authorization.data.organization.status,
  )
  if (!readiness.success) return readiness

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  await ctx.db.patch("catalogEvents", event._id, {
    status: "published",
    catalogVersion: versionResult.data,
    eventRevision: (event.eventRevision ?? 1) + 1,
    updatedAt: now,
  })
  const updated = await ctx.db.get("catalogEvents", event._id)
  if (!updated) return createResultError(op, "Event not found after publishing")
  return createResult(organizerDashboardEventSummaryCreate(updated))
}

export const organizerDashboardEventArchiveMutation = mutation({
  args: organizerDashboardEventLifecycleValidator,
  handler: (ctx, args): PromiseResult<OrganizerDashboardEventSummary> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, eventKey }) =>
      organizerDashboardEventArchiveAuthorizedFn(mutationCtx, { userId, orgId, eventKey }),
    ),
})

async function organizerDashboardEventArchiveAuthorizedFn(
  ctx: MutationCtx,
  args: { userId: IdUser; orgId: Id<"orgs">; eventKey: string },
): PromiseResult<OrganizerDashboardEventSummary> {
  const op = "organizerDashboardEventArchiveMutation"
  const authorization = await organizerDashboardEventAuthGet(ctx, args.userId, args.orgId, "events.bearbeiten")
  if (!authorization.success) return authorization
  const eventResult = await organizerDashboardEventLoad(ctx, authorization.data.orgId, args.eventKey, true)
  if (!eventResult.success) return eventResult
  const event = eventResult.data
  if (event.status === "archived" && event.deletedAt !== undefined) {
    return createResult(organizerDashboardEventSummaryCreate(event))
  }
  const endsAt = Date.parse(event.endsAt)
  if (!Number.isFinite(endsAt)) return createResultError(op, "Event end time is invalid")
  if (endsAt > Date.now()) {
    const issuedTicket = await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
      .first()
    if (event.status !== "draft" || issuedTicket) {
      return createResultError(op, "Upcoming or running events must be cancelled safely, not archived")
    }
  }

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  await ctx.db.patch("catalogEvents", event._id, {
    status: "archived",
    deletedAt: now,
    catalogVersion: versionResult.data,
    eventRevision: (event.eventRevision ?? 1) + 1,
    updatedAt: now,
  })
  const updated = await ctx.db.get("catalogEvents", event._id)
  if (!updated) return createResultError(op, "Event not found after archiving")
  return createResult(organizerDashboardEventSummaryCreate(updated))
}
