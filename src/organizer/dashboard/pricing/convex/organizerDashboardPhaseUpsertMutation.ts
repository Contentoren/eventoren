import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardPhaseUpsertSchema } from "#src/organizer/dashboard/pricing/organizerDashboardPhaseSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardPricingEventScopeGet } from "./organizerDashboardPricingEventScopeGet.ts"

/**
 * Creates or updates one automatic price phase of an org-owned tier.
 * Updates address the row by its document id; creates allocate the next
 * `sortOrder` of the tier unless one is given.
 */
export const organizerDashboardPhaseUpsertMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    phaseId: v.optional(v.string()),
    eventKey: v.string(),
    tierKey: v.string(),
    name: v.string(),
    priceCents: v.number(),
    endsAt: v.optional(v.string()),
    quota: v.optional(v.number()),
    soldCount: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  },
  handler: (ctx, args): PromiseResult<{ readonly phaseId: Id<"organizerDashboardPricePhases"> }> =>
    authMutationTokenToUserId(
      ctx,
      args,
      async (
        ctx,
        { userId, orgId, phaseId, eventKey, tierKey, name, priceCents, endsAt, quota, soldCount, sortOrder },
      ) => {
        const op = "organizerDashboardPhaseUpsertMutation"
        const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "tickets.bearbeiten")
        if (!auth.success) return auth
        const parsed = a.safeParse(organizerDashboardPhaseUpsertSchema, {
          orgId: String(orgId),
          ...(phaseId !== undefined ? { phaseId } : {}),
          eventKey,
          tierKey,
          name,
          priceCents,
          ...(endsAt !== undefined ? { endsAt } : {}),
          ...(quota !== undefined ? { quota } : {}),
          ...(soldCount !== undefined ? { soldCount } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        })
        if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
        const input = parsed.output
        const scope = await organizerDashboardPricingEventScopeGet(ctx, orgId, input.eventKey, op, input.tierKey)
        if (!scope.success) return scope
        const at = new Date().toISOString()
        if (input.phaseId !== undefined) {
          let existing = null
          try {
            existing = await ctx.db.get(
              "organizerDashboardPricePhases",
              input.phaseId as Id<"organizerDashboardPricePhases">,
            )
          } catch {
            return createResultError(op, "Preisphase nicht verfügbar")
          }
          if (!existing || existing.orgId !== orgId || existing.eventKey !== input.eventKey) {
            return createResultError(op, "Preisphase nicht verfügbar")
          }
          await ctx.db.patch(existing._id, {
            name: input.name,
            priceCents: input.priceCents,
            ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
            ...(input.quota !== undefined ? { quota: input.quota } : {}),
            ...(input.soldCount !== undefined ? { soldCount: input.soldCount } : {}),
            ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
            updatedAt: at,
          })
          return createResult({ phaseId: existing._id })
        }
        const siblings = await ctx.db
          .query("organizerDashboardPricePhases")
          .withIndex("orgIdAndEventKeyAndTierKey", (q) =>
            q.eq("orgId", orgId).eq("eventKey", input.eventKey).eq("tierKey", input.tierKey),
          )
          .collect()
        const live = siblings.filter((row) => row.archivedAt === undefined)
        const nextSort = input.sortOrder ?? (live.length === 0 ? 0 : Math.max(...live.map((row) => row.sortOrder)) + 1)
        const created = await ctx.db.insert("organizerDashboardPricePhases", {
          orgId,
          eventKey: input.eventKey,
          tierKey: input.tierKey,
          phaseKey: crypto.randomUUID(),
          name: input.name,
          priceCents: input.priceCents,
          ...(input.endsAt !== undefined ? { endsAt: input.endsAt } : {}),
          ...(input.quota !== undefined ? { quota: input.quota } : {}),
          soldCount: input.soldCount ?? 0,
          sortOrder: nextSort,
          createdAt: at,
          updatedAt: at,
        })
        return createResult({ phaseId: created })
      },
    ),
})
