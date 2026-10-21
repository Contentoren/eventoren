import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogSyncAdvanceFn } from "#src/catalog/convex/catalogSyncAdvanceFn.ts"
import { organizerDashboardTierArchiveSchema } from "#src/organizer/dashboard/events/model/organizerDashboardTierArchiveSchema.ts"
import { organizerDashboardTierFeeCompute } from "#src/organizer/dashboard/events/model/organizerDashboardTierFeeCompute.ts"
import { organizerDashboardTierUpsertParse } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertParse.ts"
import { organizerDashboardTierUpsertSchema } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertSchema.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardEventAuthGet } from "./organizerDashboardEventAuthGet.ts"
import { organizerDashboardEventLoad } from "./organizerDashboardEventLoad.ts"

export type OrganizerDashboardTierSummary = {
  tierKey: string
  name: string
  capacity: number
  reserved: number
  sold: number
  catalogVersion: number
}

const organizerDashboardTierUpsertValidator = v.object({
  orgId: v.id("orgs"),
  eventKey: v.string(),
  token: v.string(),
  ...valibotObjectToConvexFields(organizerDashboardTierUpsertSchema),
})

export const organizerDashboardTierUpsertMutation = mutation({
  args: organizerDashboardTierUpsertValidator,
  handler: (ctx, args): PromiseResult<OrganizerDashboardTierSummary> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, eventKey, ...input }) =>
      organizerDashboardTierUpsertAuthorizedFn(mutationCtx, { userId, orgId, eventKey, input }),
    ),
})

async function organizerDashboardTierUpsertAuthorizedFn(
  ctx: MutationCtx,
  args: { userId: IdUser; orgId: Id<"orgs">; eventKey: string; input: Record<string, unknown> },
): PromiseResult<OrganizerDashboardTierSummary> {
  const op = "organizerDashboardTierUpsertMutation"
  const authorization = await organizerDashboardEventAuthGet(ctx, args.userId, args.orgId, "tickets.bearbeiten")
  if (!authorization.success) return authorization
  const eventResult = await organizerDashboardEventLoad(ctx, authorization.data.orgId, args.eventKey)
  if (!eventResult.success) return eventResult
  const event = eventResult.data
  if (event.status === "archived") return createResultError(op, "Archived events cannot change ticket tiers")

  const parsed = await organizerDashboardTierUpsertParse(args.input)
  if (!parsed.success) return parsed
  const tierInput = parsed.data

  const startsAt = tierInput.startsAt ?? event.startsAt
  const endsAt = tierInput.endsAt ?? event.endsAt
  const doorsAt = tierInput.doorsAt ?? event.doorsAt
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return createResultError(op, "End time must be after start time")
  }
  if (doorsAt.trim().length > 0 && Date.parse(doorsAt) > Date.parse(startsAt)) {
    return createResultError(op, "Admission time must not be after start time")
  }

  const requestedTierKey = tierInput.tierKey
  const existing =
    requestedTierKey === undefined
      ? null
      : await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", requestedTierKey))
          .unique()
  if (tierInput.tierKey !== undefined && existing?.archivedAt !== undefined) {
    return createResultError(op, "An archived ticket tier key cannot be reused")
  }
  const reserved = existing?.reserved ?? 0
  const sold = existing?.sold ?? 0
  if (tierInput.capacity < reserved + sold) {
    return createResultError(op, "Capacity cannot be below reserved plus sold inventory")
  }
  const tierKey =
    tierInput.tierKey ??
    `tier-${Date.now().toString(36)}-${Math.floor(Math.random() * 1296)
      .toString(36)
      .padStart(2, "0")}`
  if (tierInput.tierKey === undefined) {
    const collision = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", tierKey))
      .unique()
    if (collision) return createResultError(op, "Ticket tier key collision; retry tier creation")
  }

  const feeCents = organizerDashboardTierFeeCompute({
    priceCents: tierInput.priceCents,
    fee: authorization.data.organization.fee,
  })
  const now = new Date().toISOString()
  const tierData = {
    eventId: event._id,
    tierKey,
    name: tierInput.name,
    description: tierInput.description,
    startsAt: tierInput.startsAt ?? existing?.startsAt ?? event.startsAt,
    doorsAt:
      (tierInput.doorsAt ?? existing?.doorsAt ?? event.doorsAt).trim().length === 0
        ? event.startsAt
        : (tierInput.doorsAt ?? existing?.doorsAt ?? event.doorsAt),
    endsAt: tierInput.endsAt ?? existing?.endsAt ?? event.endsAt,
    priceCents: tierInput.priceCents,
    feeCents,
    capacity: tierInput.capacity,
    maxPerOrder: tierInput.maxPerOrder ?? existing?.maxPerOrder ?? 10,
    activationCodeRequired: tierInput.activationCodeRequired ?? existing?.activationCodeRequired ?? false,
    reserved,
    sold,
    sortOrder: tierInput.sortOrder ?? existing?.sortOrder ?? 0,
  }
  const unchanged =
    existing !== null &&
    JSON.stringify({
      name: existing.name,
      description: existing.description,
      startsAt: existing.startsAt,
      doorsAt: existing.doorsAt,
      endsAt: existing.endsAt,
      priceCents: existing.priceCents,
      feeCents: existing.feeCents,
      capacity: existing.capacity,
      maxPerOrder: existing.maxPerOrder,
      activationCodeRequired: existing.activationCodeRequired,
      sortOrder: existing.sortOrder,
    }) ===
      JSON.stringify({
        name: tierData.name,
        description: tierData.description,
        startsAt: tierData.startsAt,
        doorsAt: tierData.doorsAt,
        endsAt: tierData.endsAt,
        priceCents: tierData.priceCents,
        feeCents: tierData.feeCents,
        capacity: tierData.capacity,
        maxPerOrder: tierData.maxPerOrder,
        activationCodeRequired: tierData.activationCodeRequired,
        sortOrder: tierData.sortOrder,
      })
  if (unchanged && existing !== null) {
    return createResult({
      tierKey: existing.tierKey,
      name: existing.name,
      capacity: existing.capacity,
      reserved: existing.reserved,
      sold: existing.sold,
      catalogVersion: existing.catalogVersion,
    })
  }

  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  if (existing) {
    await ctx.db.patch("catalogTicketTiers", existing._id, {
      ...tierData,
      catalogVersion: versionResult.data,
      updatedAt: now,
    })
  } else {
    await ctx.db.insert("catalogTicketTiers", {
      ...tierData,
      catalogVersion: versionResult.data,
      createdAt: now,
      updatedAt: now,
    })
  }
  await ctx.db.patch("catalogEvents", event._id, {
    catalogVersion: versionResult.data,
    eventRevision: (event.eventRevision ?? 1) + 1,
    updatedAt: now,
  })
  return createResult({
    tierKey,
    name: tierData.name,
    capacity: tierData.capacity,
    reserved,
    sold,
    catalogVersion: versionResult.data,
  })
}

const organizerDashboardTierArchiveValidator = v.object({
  orgId: v.id("orgs"),
  eventKey: v.string(),
  token: v.string(),
  ...valibotObjectToConvexFields(organizerDashboardTierArchiveSchema),
})

export const organizerDashboardTierArchiveMutation = mutation({
  args: organizerDashboardTierArchiveValidator,
  handler: (ctx, args): PromiseResult<{ tierKey: string; archivedAt: string }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, eventKey, tierKey }) =>
      organizerDashboardTierArchiveAuthorizedFn(mutationCtx, { userId, orgId, eventKey, tierKey }),
    ),
})

async function organizerDashboardTierArchiveAuthorizedFn(
  ctx: MutationCtx,
  args: { userId: IdUser; orgId: Id<"orgs">; eventKey: string; tierKey: string },
): PromiseResult<{ tierKey: string; archivedAt: string }> {
  const op = "organizerDashboardTierArchiveMutation"
  if (args.tierKey.trim().length === 0) return createResultError(op, "Tier key is required")
  const authorization = await organizerDashboardEventAuthGet(ctx, args.userId, args.orgId, "tickets.bearbeiten")
  if (!authorization.success) return authorization
  const eventResult = await organizerDashboardEventLoad(ctx, authorization.data.orgId, args.eventKey)
  if (!eventResult.success) return eventResult
  const event = eventResult.data
  if (event.status === "archived") return createResultError(op, "Archived events cannot change ticket tiers")

  const tier = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", args.tierKey))
    .unique()
  if (!tier || tier.archivedAt !== undefined) return createResultError(op, "Ticket tier not found")
  if (tier.reserved > 0) return createResultError(op, "Ticket tiers with active reservations cannot be archived")

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  await ctx.db.patch("catalogTicketTiers", tier._id, {
    archivedAt: now,
    catalogVersion: versionResult.data,
    updatedAt: now,
  })
  await ctx.db.patch("catalogEvents", event._id, {
    catalogVersion: versionResult.data,
    eventRevision: (event.eventRevision ?? 1) + 1,
    updatedAt: now,
  })
  return createResult({ tierKey: tier.tierKey, archivedAt: now })
}
