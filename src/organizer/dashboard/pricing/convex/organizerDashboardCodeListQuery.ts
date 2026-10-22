import { paginationOptsValidator } from "convex/server"
import * as a from "valibot"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardCodeListFilterSchema } from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import type { OrganizerDashboardCodeKind } from "#src/organizer/dashboard/pricing/organizerDashboardCodeSchema.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardPricingEventScopeGet } from "./organizerDashboardPricingEventScopeGet.ts"

export type OrganizerDashboardCodeRow = {
  readonly codeId: string
  readonly kind: OrganizerDashboardCodeKind
  readonly code: string
  readonly discountType: "prozent" | "betrag" | null
  readonly discountValue: number | null
  readonly tierKeys: readonly string[]
  readonly maxTickets: number | null
  readonly usedTickets: number
  readonly validFrom: string | null
  readonly validUntil: string | null
  readonly active: boolean
  readonly note: string | null
}

/** Discount and access codes of one event, newest first. Kind is a bounded-window postfilter. */
export const organizerDashboardCodeListQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    kind: v.optional(v.union(v.literal("rabatt"), v.literal("zugang"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardCodeRow[]
    readonly isDone: boolean
    readonly continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, kind, paginationOpts }) => {
      const op = "organizerDashboardCodeListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "codes.bearbeiten")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardCodeListFilterSchema, {
        orgId: String(orgId),
        eventKey,
        ...(kind !== undefined ? { kind } : {}),
      })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50) {
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      }
      const scope = await organizerDashboardPricingEventScopeGet(ctx, orgId, filters.output.eventKey, op)
      if (!scope.success) return scope
      const page = await ctx.db
        .query("organizerDashboardCodes")
        .withIndex("orgIdAndEventKeyAndCode", (q) => q.eq("orgId", orgId).eq("eventKey", scope.data.event.eventKey))
        .order("desc")
        .paginate(paginationOpts)
      const rows: OrganizerDashboardCodeRow[] = []
      for (const row of page.page) {
        if (filters.output.kind && row.kind !== filters.output.kind) continue
        rows.push({
          codeId: String(row._id),
          kind: row.kind,
          code: row.code,
          discountType: row.discountType ?? null,
          discountValue: row.discountValue ?? null,
          tierKeys: row.tierKeys,
          maxTickets: row.maxTickets ?? null,
          usedTickets: row.usedTickets,
          validFrom: row.validFrom ?? null,
          validUntil: row.validUntil ?? null,
          active: row.active,
          note: row.note ?? null,
        })
      }
      return createResult({ page: rows, isDone: page.isDone, continueCursor: page.continueCursor })
    }),
})
