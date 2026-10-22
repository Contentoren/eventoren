import { paginationOptsValidator } from "convex/server"
import * as a from "valibot"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import type { Id } from "#convex/_generated/dataModel.js"
import type { OrganizerDashboardPayoutStatus } from "../organizerDashboardFinanceFilterSchema.ts"
import { organizerDashboardPayoutListFilterSchema } from "../organizerDashboardFinanceFilterSchema.ts"

export type OrganizerDashboardPayoutSummary = {
  payoutId: Id<"organizerDashboardPayouts">
  eventKey: string
  eventTitle: string | null
  amountCents: number
  status: OrganizerDashboardPayoutStatus
  note: string | null
  decidedAt: string
  paidAt: string | null
}

/** Recorded payouts (Auszahlungen) for the org, newest first. */
export const organizerDashboardPayoutListQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.optional(v.string()),
    status: v.optional(v.union(v.literal("vorgemerkt"), v.literal("ausgezahlt"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    page: OrganizerDashboardPayoutSummary[]
    isDone: boolean
    continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, status, paginationOpts }) => {
      const op = "organizerDashboardPayoutListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "finanzen.sehen")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardPayoutListFilterSchema, {
        orgId: String(orgId),
        ...(eventKey !== undefined ? { eventKey } : {}),
        ...(status !== undefined ? { status } : {}),
      })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50) {
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      }
      const source = filters.output.eventKey
        ? ctx.db
            .query("organizerDashboardPayouts")
            .withIndex("orgIdAndEventKeyAndCreatedAt", (q) =>
              q.eq("orgId", orgId).eq("eventKey", filters.output.eventKey as string),
            )
        : ctx.db.query("organizerDashboardPayouts").withIndex("orgIdAndCreatedAt", (q) => q.eq("orgId", orgId))
      const page = await source.order("desc").paginate(paginationOpts)
      const summaries: OrganizerDashboardPayoutSummary[] = []
      for (const payout of page.page) {
        if (filters.output.status && payout.status !== filters.output.status) continue
        const event = await ctx.db
          .query("catalogEvents")
          .withIndex("eventKey", (q) => q.eq("eventKey", payout.eventKey))
          .unique()
        summaries.push({
          payoutId: payout._id,
          eventKey: payout.eventKey,
          eventTitle: event && event.orgId === orgId ? event.title : null,
          amountCents: payout.amountCents,
          status: payout.status,
          note: payout.note ?? null,
          decidedAt: payout.decidedAt,
          paidAt: payout.paidAt ?? null,
        })
      }
      return createResult({ page: summaries, isDone: page.isDone, continueCursor: page.continueCursor })
    }),
})
