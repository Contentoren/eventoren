import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

const catalogTicketTierArgsValidator = v.object({
  eventKey: v.string(),
  tierKey: v.string(),
  name: v.string(),
  description: v.string(),
  startsAt: v.string(),
  doorsAt: v.string(),
  additionalDoorsAt: v.optional(v.array(v.string())),
  endsAt: v.string(),
  priceCents: v.number(),
  feeCents: v.number(),
  capacity: v.number(),
  sortOrder: v.optional(v.number()),
  token: v.string(),
})

export const catalogTicketTierUpsertMutation = mutation({
  args: catalogTicketTierArgsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogTicketTierUpsertAuthorizedFn),
})

async function catalogTicketTierUpsertAuthorizedFn(
  ctx: MutationCtx,
  args: Omit<typeof catalogTicketTierArgsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<{ tierKey: string; catalogVersion: number }> {
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult

  const op = "catalogTicketTierUpsertMutation"
  if (args.eventKey.trim().length === 0) return createResultError(op, "Event key is required")
  if (args.tierKey.trim().length === 0) return createResultError(op, "Tier key is required")
  if (args.name.trim().length === 0) return createResultError(op, "Tier name is required")
  if (args.startsAt.trim().length === 0) return createResultError(op, "Start time is required")
  if (args.endsAt.trim().length === 0) return createResultError(op, "End time is required")
  if (!isValidIsoDateTime(args.startsAt)) return createResultError(op, "Start time must be a valid ISO date and time")
  if (!isValidIsoDateTime(args.endsAt)) return createResultError(op, "End time must be a valid ISO date and time")
  if (args.doorsAt.trim().length > 0 && !isValidIsoDateTime(args.doorsAt))
    return createResultError(op, "Admission time must be a valid ISO date and time")
  if (args.additionalDoorsAt?.some((value) => !value.trim() || Number.isNaN(Date.parse(value))))
    return createResultError(op, "Additional admission times must be valid dates")
  if (!Number.isInteger(args.priceCents) || args.priceCents < 0)
    return createResultError(op, "Price must be a non-negative integer")
  if (!Number.isInteger(args.feeCents) || args.feeCents < 0)
    return createResultError(op, "Fee must be a non-negative integer")
  if (!Number.isInteger(args.capacity) || args.capacity < 0)
    return createResultError(op, "Capacity must be a non-negative integer")
  if (args.sortOrder !== undefined && (!Number.isInteger(args.sortOrder) || args.sortOrder < 0))
    return createResultError(op, "Sort order must be a non-negative integer")

  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event || event.deletedAt) return createResultError(op, "Event not found")

  const existing = await ctx.db
    .query("catalogTicketTiers")
    .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", args.tierKey))
    .unique()
  if (existing?.archivedAt) return createResultError(op, "An archived ticket tier key cannot be reused")
  const reserved = existing?.reserved ?? 0
  const sold = existing?.sold ?? 0
  if (args.capacity < reserved + sold) {
    return createResultError(op, "Capacity cannot be below reserved plus sold inventory")
  }

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const catalogVersion = versionResult.data
  const tierData = {
    eventId: event._id,
    tierKey: args.tierKey,
    name: args.name,
    description: args.description,
    startsAt: args.startsAt,
    doorsAt: args.doorsAt.trim().length === 0 ? args.startsAt : args.doorsAt,
    additionalDoorsAt: args.additionalDoorsAt ?? [],
    endsAt: args.endsAt,
    priceCents: args.priceCents,
    feeCents: args.feeCents,
    capacity: args.capacity,
    reserved,
    sold,
    sortOrder: args.sortOrder ?? existing?.sortOrder ?? 0,
    catalogVersion,
    updatedAt: now,
  }

  if (existing) {
    await ctx.db.patch("catalogTicketTiers", existing._id, tierData)
  } else {
    await ctx.db.insert("catalogTicketTiers", { ...tierData, createdAt: now })
  }
  await ctx.db.patch("catalogEvents", event._id, { catalogVersion, updatedAt: now })

  return createResult({ tierKey: args.tierKey, catalogVersion })
}

function isValidIsoDateTime(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.exec(
      value,
    )
  if (!match || Number.isNaN(Date.parse(value))) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= (daysInMonth[month - 1] ?? 0)
}
