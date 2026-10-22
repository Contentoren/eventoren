import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogSyncAdvanceFn } from "#src/catalog/convex/catalogSyncAdvanceFn.ts"
import { organizerDashboardEventPatchParse } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchParse.ts"
import { organizerDashboardEventPatchSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchSchema.ts"
import type { OrganizerDashboardEventSummary } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { organizerDashboardEventSummaryCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardEventAuthGet } from "./organizerDashboardEventAuthGet.ts"
import { organizerDashboardEventLoad } from "./organizerDashboardEventLoad.ts"

const organizerDashboardEventUpdateValidator = v.object({
  orgId: v.id("orgs"),
  eventKey: v.string(),
  token: v.string(),
  ...valibotObjectToConvexFields(organizerDashboardEventPatchSchema),
})

export const organizerDashboardEventUpdateMutation = mutation({
  args: organizerDashboardEventUpdateValidator,
  handler: (ctx, args): PromiseResult<OrganizerDashboardEventSummary> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, eventKey, ...input }) =>
      organizerDashboardEventUpdateAuthorizedFn(mutationCtx, { userId, orgId, eventKey, input }),
    ),
})

async function organizerDashboardEventUpdateAuthorizedFn(
  ctx: MutationCtx,
  args: { userId: IdUser; orgId: Id<"orgs">; eventKey: string; input: Record<string, unknown> },
): PromiseResult<OrganizerDashboardEventSummary> {
  const op = "organizerDashboardEventUpdateMutation"
  const authorization = await organizerDashboardEventAuthGet(ctx, args.userId, args.orgId, "events.bearbeiten")
  if (!authorization.success) return authorization
  const eventResult = await organizerDashboardEventLoad(ctx, authorization.data.orgId, args.eventKey)
  if (!eventResult.success) return eventResult
  const event = eventResult.data
  if (event.status !== "draft") {
    return createResultError(
      op,
      "Nur Entwürfe können bearbeitet werden; veröffentlichte Veranstaltungen folgen dem Archivablauf.",
    )
  }

  const parsed = await organizerDashboardEventPatchParse(args.input)
  if (!parsed.success) return parsed
  const patch = parsed.data

  const startsAt = patch.startsAt ?? event.startsAt
  const endsAt = patch.endsAt ?? event.endsAt
  const doorsAt = patch.doorsAt ?? event.doorsAt
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return createResultError(op, "Das Ende muss nach dem Beginn liegen.")
  }
  if (Date.parse(doorsAt) > Date.parse(startsAt)) {
    return createResultError(op, "Der Einlass darf nicht nach dem Beginn liegen.")
  }

  const now = new Date().toISOString()
  const next = {
    title: patch.title ?? event.title,
    subtitle: patch.subtitle ?? event.subtitle,
    description: patch.description ?? event.description,
    category: patch.category ?? event.category,
    startsAt,
    endsAt,
    doorsAt,
    ...(patch.bookingOpensAt === undefined
      ? event.bookingOpensAt === undefined
        ? {}
        : { bookingOpensAt: event.bookingOpensAt }
      : { bookingOpensAt: patch.bookingOpensAt }),
    venue: patch.venue ?? event.venue,
    city: patch.city ?? event.city,
    address: patch.address ?? event.address,
    organizer: patch.organizer ?? event.organizer,
    imageUrl: patch.imageUrl ?? event.imageUrl,
    ...(patch.imageUrl !== undefined && patch.imageUrl !== event.imageUrl ? { imageVariants: undefined } : {}),
    imageAlt: patch.imageAlt ?? event.imageAlt,
    tags: patch.tags ?? event.tags,
    ...((patch.faqs ?? event.faqs) === undefined ? {} : { faqs: patch.faqs ?? event.faqs }),
    ...((patch.schedule ?? event.schedule) === undefined ? {} : { schedule: patch.schedule ?? event.schedule }),
  }
  const unchanged =
    JSON.stringify({ ...next, status: event.status }) ===
    JSON.stringify({
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      category: event.category,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      doorsAt: event.doorsAt,
      ...(event.bookingOpensAt === undefined ? {} : { bookingOpensAt: event.bookingOpensAt }),
      venue: event.venue,
      city: event.city,
      address: event.address,
      organizer: event.organizer,
      imageUrl: event.imageUrl,
      imageAlt: event.imageAlt,
      tags: event.tags,
      ...(event.faqs === undefined ? {} : { faqs: event.faqs }),
      ...(event.schedule === undefined ? {} : { schedule: event.schedule }),
      status: event.status,
    })
  if (unchanged) return createResult(organizerDashboardEventSummaryCreate(event))

  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  await ctx.db.patch("catalogEvents", event._id, {
    ...next,
    catalogVersion: versionResult.data,
    eventRevision: (event.eventRevision ?? 1) + 1,
    updatedAt: now,
  })
  const updated = await ctx.db.get("catalogEvents", event._id)
  if (!updated)
    return createResultError(op, "Veranstaltung wurde gespeichert, konnte aber nicht erneut geladen werden.")
  return createResult(organizerDashboardEventSummaryCreate(updated))
}
