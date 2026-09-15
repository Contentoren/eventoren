import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"

const catalogEventArgsValidator = v.object({
  eventKey: v.string(),
  title: v.string(),
  subtitle: v.string(),
  description: v.string(),
  category: v.union(
    v.literal("konzerte"),
    v.literal("festivals"),
    v.literal("kultur"),
    v.literal("sport"),
    v.literal("reisen"),
  ),
  startsAt: v.string(),
  endsAt: v.string(),
  doorsAt: v.string(),
  venue: v.string(),
  city: v.string(),
  address: v.string(),
  organizer: v.string(),
  imageUrl: v.string(),
  imageAlt: v.string(),
  tags: v.array(v.string()),
  status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
  token: v.string(),
})

export const catalogEventUpsertMutation = mutation({
  args: catalogEventArgsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogEventUpsertAuthorizedFn),
})

async function catalogEventUpsertAuthorizedFn(
  ctx: MutationCtx,
  args: Omit<typeof catalogEventArgsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<{ eventKey: string; catalogVersion: number }> {
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult

  if (args.eventKey.length === 0) return createResultError("catalogEventUpsertMutation", "Event key is required")

  const existing = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  const status = args.status ?? existing?.status ?? "draft"

  if (status === "published") {
    const tier = existing
      ? await ctx.db
          .query("catalogTicketTiers")
          .withIndex("eventId", (q) => q.eq("eventId", existing._id))
          .first()
      : null
    if (!tier) return createResultError("catalogEventUpsertMutation", "Published events need a ticket tier")
  }

  const now = new Date().toISOString()
  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const catalogVersion = versionResult.data
  const eventData = {
    eventKey: args.eventKey,
    title: args.title,
    subtitle: args.subtitle,
    description: args.description,
    category: args.category,
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    doorsAt: args.doorsAt,
    venue: args.venue,
    city: args.city,
    address: args.address,
    organizer: args.organizer,
    imageUrl: args.imageUrl,
    imageAlt: args.imageAlt,
    tags: args.tags,
    status,
    catalogVersion,
    updatedAt: now,
  }

  if (existing) {
    await ctx.db.patch("catalogEvents", existing._id, eventData)
  } else {
    await ctx.db.insert("catalogEvents", { ...eventData, createdAt: now })
  }

  return createResult({ eventKey: args.eventKey, catalogVersion })
}
