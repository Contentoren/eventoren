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
  if (event.title.trim().length === 0)
    return createResultError(op, "Ein Titel ist für die Veröffentlichung erforderlich.")
  if (Number.isNaN(Date.parse(event.startsAt)) || Number.isNaN(Date.parse(event.endsAt))) {
    return createResultError(op, "Beginn und Ende müssen für die Veröffentlichung gültige Daten sein.")
  }
  if (Date.parse(event.endsAt) <= Date.parse(event.startsAt)) {
    return createResultError(op, "Das Ende muss nach dem Beginn liegen.")
  }
  if (event.venue.trim().length === 0 || event.city.trim().length === 0) {
    return createResultError(op, "Veranstaltungsort und Stadt sind für die Veröffentlichung erforderlich.")
  }
  if (event.imageUrl.trim().length === 0)
    return createResultError(op, "Ein Titelbild ist für die Veröffentlichung erforderlich.")
  if (event.imageAlt.trim().length === 0) {
    return createResultError(op, "Ein Alternativtext zum Titelbild ist für die Veröffentlichung erforderlich.")
  }
  if (tierActiveCount === 0)
    return createResultError(op, "Mindestens eine Ticketart ist für die Veröffentlichung erforderlich.")
  if (organizationStatus !== "aktiv")
    return createResultError(op, "Die Organisation muss für die Veröffentlichung aktiv sein.")
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
  if (event.status === "archived")
    return createResultError(op, "Archivierte Veranstaltungen können nicht erneut veröffentlicht werden.")

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
  if (!updated)
    return createResultError(op, "Veranstaltung wurde veröffentlicht, konnte aber nicht erneut geladen werden.")
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
  if (!Number.isFinite(endsAt)) return createResultError(op, "Das Veranstaltungsende ist ungültig.")
  if (endsAt > Date.now()) {
    const issuedTicket = await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", event.eventKey))
      .first()
    if (event.status !== "draft" || issuedTicket) {
      return createResultError(
        op,
        "Bevorstehende oder laufende Veranstaltungen müssen abgesagt, nicht archiviert werden.",
      )
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
  if (!updated) return createResultError(op, "Veranstaltung wurde archiviert, konnte aber nicht erneut geladen werden.")
  return createResult(organizerDashboardEventSummaryCreate(updated))
}
