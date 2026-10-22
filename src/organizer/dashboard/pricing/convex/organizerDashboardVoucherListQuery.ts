import { paginationOptsValidator } from "convex/server"
import * as a from "valibot"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardVoucherListFilterSchema } from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"
import type {
  OrganizerDashboardVoucherStatus,
  OrganizerDashboardVoucherValidity,
} from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

export type OrganizerDashboardVoucherRow = {
  readonly voucherId: string
  readonly code: string
  readonly initialCents: number
  readonly balanceCents: number
  readonly validity: OrganizerDashboardVoucherValidity
  readonly expiresAt: string | null
  readonly expired: boolean
  readonly status: OrganizerDashboardVoucherStatus
  readonly recipientName: string | null
  readonly recipientEmail: string | null
}

/**
 * Organization vouchers, newest first. `expired` is derived from `expiresAt`
 * against the current instant; expired vouchers refuse redemption.
 */
export const organizerDashboardVoucherListQuery = query({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    status: v.optional(v.union(v.literal("aktiv"), v.literal("eingeloest"), v.literal("deaktiviert"))),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardVoucherRow[]
    readonly isDone: boolean
    readonly continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, status, paginationOpts }) => {
      const op = "organizerDashboardVoucherListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gutscheine.bearbeiten")
      if (!auth.success) return auth
      const filters = a.safeParse(organizerDashboardVoucherListFilterSchema, {
        orgId: String(orgId),
        ...(status !== undefined ? { status } : {}),
      })
      if (!filters.success) return createResultError(op, filters.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 50) {
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      }
      const page = await ctx.db
        .query("organizerDashboardVouchers")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .order("desc")
        .paginate(paginationOpts)
      const now = new Date().toISOString()
      const rows: OrganizerDashboardVoucherRow[] = []
      for (const row of page.page) {
        if (filters.output.status && row.status !== filters.output.status) continue
        rows.push({
          voucherId: String(row._id),
          code: row.code,
          initialCents: row.initialCents,
          balanceCents: row.balanceCents,
          validity: row.validity,
          expiresAt: row.expiresAt ?? null,
          expired: row.expiresAt !== undefined && row.expiresAt < now,
          status: row.status,
          recipientName: row.recipientName ?? null,
          recipientEmail: row.recipientEmail ?? null,
        })
      }
      return createResult({ page: rows, isDone: page.isDone, continueCursor: page.continueCursor })
    }),
})
