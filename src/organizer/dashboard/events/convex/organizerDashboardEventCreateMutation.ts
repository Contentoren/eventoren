import { v } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { catalogSyncAdvanceFn } from "#src/catalog/convex/catalogSyncAdvanceFn.ts"
import { organizerDashboardEventCreateParse } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateParse.ts"
import { organizerDashboardEventCreateSchema } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateSchema.ts"
import type { OrganizerDashboardEventSummary } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { organizerDashboardEventSummaryCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventSummaryCreate.ts"
import { valibotObjectToConvexFields } from "#src/utils/convex/valibotToConvex.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardEventAuthGet } from "./organizerDashboardEventAuthGet.ts"

const organizerDashboardEventKeyAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

function organizerDashboardEventKeyCreate(title: string, random: () => number, now: number): string {
  const slug = title
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "")
  const fallback = slug.length > 0 ? slug : "event"
  let suffix = ""
  for (let index = 0; index < 6; index += 1) {
    const slot = Math.floor(random() * organizerDashboardEventKeyAlphabet.length)
    suffix += organizerDashboardEventKeyAlphabet[slot] ?? "a"
  }
  return `${fallback}-${now.toString(36)}${suffix}`
}

const organizerDashboardEventCreateValidator = v.object({
  orgId: v.id("orgs"),
  token: v.string(),
  ...valibotObjectToConvexFields(organizerDashboardEventCreateSchema),
})

export const organizerDashboardEventCreateMutation = mutation({
  args: organizerDashboardEventCreateValidator,
  handler: (ctx, args): PromiseResult<OrganizerDashboardEventSummary> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, ...input }) =>
      organizerDashboardEventCreateAuthorizedFn(mutationCtx, { ...input, userId, orgId }),
    ),
})

async function organizerDashboardEventCreateAuthorizedFn(
  ctx: MutationCtx,
  args: Record<string, unknown> & { userId: IdUser; orgId: Id<"orgs"> },
): PromiseResult<OrganizerDashboardEventSummary> {
  const op = "organizerDashboardEventCreateMutation"
  const authorization = await organizerDashboardEventAuthGet(ctx, args.userId, args.orgId, "events.bearbeiten")
  if (!authorization.success) return authorization

  const parsed = await organizerDashboardEventCreateParse({
    title: args.title,
    subtitle: args.subtitle ?? "",
    description: args.description ?? "",
    category: args.category,
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    doorsAt: args.doorsAt,
    ...(args.bookingOpensAt === undefined ? {} : { bookingOpensAt: args.bookingOpensAt }),
    venue: args.venue,
    city: args.city,
    address: args.address ?? "",
    organizer: args.organizer ?? "",
    imageUrl: args.imageUrl ?? "",
    imageAlt: args.imageAlt ?? "",
    ...(args.tags === undefined ? {} : { tags: args.tags }),
    ...(args.faqs === undefined ? {} : { faqs: args.faqs }),
    ...(args.schedule === undefined ? {} : { schedule: args.schedule }),
  })
  if (!parsed.success) return parsed
  const input = parsed.data

  const now = new Date().toISOString()
  const eventKey = organizerDashboardEventKeyCreate(input.title, Math.random, Date.now())
  const existing = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", eventKey))
    .unique()
  if (existing) return createResultError(op, "Veranstaltung konnte nicht angelegt werden, bitte erneut versuchen.")

  const versionResult = await catalogSyncAdvanceFn(ctx, args.userId, now)
  if (!versionResult.success) return versionResult
  const eventId = await ctx.db.insert("catalogEvents", {
    eventKey,
    orgId: authorization.data.orgId,
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    category: input.category,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    doorsAt: input.doorsAt,
    ...(input.bookingOpensAt === undefined ? {} : { bookingOpensAt: input.bookingOpensAt }),
    venue: input.venue,
    city: input.city,
    address: input.address,
    organizer: input.organizer,
    imageUrl: input.imageUrl,
    imageVariants: undefined,
    imageAlt: input.imageAlt,
    tags: input.tags ?? [],
    ...(input.faqs === undefined ? {} : { faqs: input.faqs }),
    ...(input.schedule === undefined ? {} : { schedule: input.schedule }),
    status: "draft",
    catalogVersion: versionResult.data,
    eventRevision: 1,
    createdAt: now,
    updatedAt: now,
  })
  const event = await ctx.db.get("catalogEvents", eventId)
  if (!event) return createResultError(op, "Veranstaltung wurde angelegt, konnte aber nicht erneut geladen werden.")
  return createResult(organizerDashboardEventSummaryCreate(event))
}
