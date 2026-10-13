import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogSyncAdvanceFn } from "./catalogSyncAdvanceFn.js"
import { catalogAllowedStripePaymentMethodsValidator } from "./catalogAllowedStripePaymentMethodsValidator.ts"
import { catalogAllowedStripePaymentMethodsNormalize } from "../catalogAllowedStripePaymentMethodsNormalize.ts"

const catalogEventArgsValidator = v.object({
  eventKey: v.string(),
  title: v.string(),
  subtitle: v.string(),
  description: v.string(),
  category: v.string(),
  startsAt: v.string(),
  endsAt: v.string(),
  doorsAt: v.string(),
  venue: v.string(),
  city: v.string(),
  address: v.string(),
  organizer: v.string(),
  imageUrl: v.string(),
  imageVariants: v.optional(
    v.object({ assetId: v.string(), detail: v.string(), card: v.string(), organizer: v.string() }),
  ),
  imageAlt: v.string(),
  tags: v.array(v.string()),
  highlights: v.optional(v.array(v.object({ title: v.string(), description: v.string() }))),
  inclusions: v.optional(v.array(v.string())),
  exclusions: v.optional(v.array(v.string())),
  allowedStripePaymentMethods: v.optional(catalogAllowedStripePaymentMethodsValidator),
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
): PromiseResult<{ eventKey: string; catalogVersion: number; eventRevision: number }> {
  const op = "catalogEventUpsertMutation"
  const adminResult = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!adminResult.success) return adminResult

  const policyResult = catalogAllowedStripePaymentMethodsNormalize(args.allowedStripePaymentMethods)
  if (!policyResult.success) return policyResult

  if (args.eventKey.length === 0) return createResultError(op, "Event key is required")
  if (args.startsAt.trim() && Number.isNaN(Date.parse(args.startsAt)))
    return createResultError(op, "Start time must be a valid date and time")
  if (args.endsAt.trim() && Number.isNaN(Date.parse(args.endsAt)))
    return createResultError(op, "End time must be a valid date and time")
  if (args.doorsAt.trim() && Number.isNaN(Date.parse(args.doorsAt)))
    return createResultError(op, "Admission time must be a valid date and time")
  if (args.startsAt.trim() && args.endsAt.trim() && Date.parse(args.endsAt) <= Date.parse(args.startsAt))
    return createResultError(op, "End time must be after start time")

  const existing = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (existing?.deletedAt) return createResultError(op, "Deleted event keys cannot be reused")
  const existingPolicyResult = catalogAllowedStripePaymentMethodsNormalize(existing?.allowedStripePaymentMethods)
  if (!existingPolicyResult.success) return existingPolicyResult
  // An explicit manual URL change invalidates the previous uploaded image references.
  const imageVariants =
    args.imageVariants && args.imageUrl === args.imageVariants.detail
      ? args.imageVariants
      : args.imageUrl === existing?.imageUrl
        ? existing.imageVariants
        : undefined
  const status = args.status ?? existing?.status ?? "draft"

  const now = new Date().toISOString()
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
    imageVariants,
    imageAlt: args.imageAlt,
    tags: args.tags,
    highlights: args.highlights ?? existing?.highlights,
    inclusions: args.inclusions ?? existing?.inclusions,
    exclusions: args.exclusions ?? existing?.exclusions,
    // This full upsert uses omission (including the UI's empty selection) to clear an override.
    allowedStripePaymentMethods: policyResult.data,
    status,
  }

  const configurationChanged =
    !existing ||
    JSON.stringify({
      eventKey: existing.eventKey,
      title: existing.title,
      subtitle: existing.subtitle,
      description: existing.description,
      category: existing.category,
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
      doorsAt: existing.doorsAt,
      venue: existing.venue,
      city: existing.city,
      address: existing.address,
      organizer: existing.organizer,
      imageUrl: existing.imageUrl,
      imageVariants: existing.imageVariants,
      imageAlt: existing.imageAlt,
      tags: existing.tags,
      highlights: existing.highlights,
      inclusions: existing.inclusions,
      exclusions: existing.exclusions,
      allowedStripePaymentMethods: existingPolicyResult.data,
      status: existing.status,
    }) !== JSON.stringify(eventData)

  if (existing && !configurationChanged) {
    const eventRevision = existing.eventRevision ?? 1
    if (existing.eventRevision === undefined) await ctx.db.patch("catalogEvents", existing._id, { eventRevision })
    return createResult({ eventKey: args.eventKey, catalogVersion: existing.catalogVersion, eventRevision })
  }

  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const catalogVersion = versionResult.data
  const eventRevision = existing ? (existing.eventRevision ?? 1) + 1 : 1
  const persistedEventData = { ...eventData, catalogVersion, eventRevision, updatedAt: now }

  if (existing) {
    await ctx.db.patch("catalogEvents", existing._id, persistedEventData)
  } else {
    await ctx.db.insert("catalogEvents", { ...persistedEventData, createdAt: now })
  }

  return createResult({ eventKey: args.eventKey, catalogVersion, eventRevision })
}
