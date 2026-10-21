import * as a from "valibot"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardPhaseListFilterSchema } from "#src/organizer/dashboard/pricing/organizerDashboardPhaseSchema.ts"
import { organizerDashboardPhaseResolve } from "#src/organizer/dashboard/pricing/organizerDashboardPhaseResolve.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardPricingEventScopeGet } from "./organizerDashboardPricingEventScopeGet.ts"

export type OrganizerDashboardPhaseRow = {
  readonly phaseId: string
  readonly phaseKey: string
  readonly name: string
  readonly priceCents: number
  readonly endsAt: string | null
  readonly quota: number | null
  readonly soldCount: number
  readonly sortOrder: number
}

export type OrganizerDashboardPhaseList = {
  readonly eventKey: string
  readonly tierKey: string
  readonly capacity: number
  readonly phases: readonly OrganizerDashboardPhaseRow[]
  readonly activePhaseKey: string | null
  readonly activeState: "geplant" | "aktiv" | "ausverkauft" | "beendet"
  readonly truncated: boolean
}

const maxPhasesPerTier = 200

/**
 * Lists the automatic price phases of one ticket tier together with the
 * currently resolved phase. Canonical tiers carry no sales window, so the
 * window is open; time-based switching resolves purely from `endsAt`.
 */
export const organizerDashboardPhaseListQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    tierKey: v.optional(v.string()),
  },
  handler: (ctx, args): PromiseResult<readonly OrganizerDashboardPhaseList[]> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, tierKey }) => {
      const op = "organizerDashboardPhaseListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "tickets.bearbeiten")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardPhaseListFilterSchema, {
        orgId: String(orgId),
        eventKey,
        ...(tierKey !== undefined ? { tierKey } : {}),
      })
      if (!filters.success) return createResultError(op, a.summarize(filters.issues))
      const scope = await organizerDashboardPricingEventScopeGet(
        ctx,
        orgId,
        filters.output.eventKey,
        op,
        filters.output.tierKey,
      )
      if (!scope.success) return scope
      const tiers =
        scope.data.tier !== null
          ? [scope.data.tier]
          : await ctx.db
              .query("catalogTicketTiers")
              .withIndex("eventIdAndArchivedAt", (q) => q.eq("eventId", scope.data.event._id))
              .collect()
      const nowIso = new Date().toISOString()
      const lists: OrganizerDashboardPhaseList[] = []
      for (const tier of tiers) {
        if (tier.archivedAt !== undefined) continue
        const rows = await ctx.db
          .query("organizerDashboardPricePhases")
          .withIndex("tierScopeAndSortOrder", (q) =>
            q.eq("orgId", orgId).eq("eventKey", filters.output.eventKey).eq("tierKey", tier.tierKey),
          )
          .take(maxPhasesPerTier + 1)
        const live = rows.filter((row) => row.archivedAt === undefined)
        const resolved = organizerDashboardPhaseResolve({
          phases: live.map((row) => ({
            phaseKey: row.phaseKey,
            name: row.name,
            priceCents: row.priceCents,
            endsAt: row.endsAt ?? null,
            quota: row.quota ?? null,
            soldCount: row.soldCount,
            sortOrder: row.sortOrder,
          })),
          capacity: tier.capacity,
          salesStartAt: null,
          salesEndAt: null,
          nowIso,
        })
        if (!resolved.success) return createResultError(op, resolved.errorMessage)
        lists.push({
          eventKey: filters.output.eventKey,
          tierKey: tier.tierKey,
          capacity: tier.capacity,
          phases: live.map((row) => ({
            phaseId: String(row._id),
            phaseKey: row.phaseKey,
            name: row.name,
            priceCents: row.priceCents,
            endsAt: row.endsAt ?? null,
            quota: row.quota ?? null,
            soldCount: row.soldCount,
            sortOrder: row.sortOrder,
          })),
          activePhaseKey: resolved.data.phase?.phaseKey ?? null,
          activeState: resolved.data.state,
          truncated: rows.length > maxPhasesPerTier,
        })
      }
      return createResult(lists)
    }),
})
