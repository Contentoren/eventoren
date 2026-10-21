import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

const organizerDashboardPayoutStatusUpdateSchema = a.strictObject({
  orgId: a.pipe(a.string(), a.trim(), a.nonEmpty("Cannot be empty")),
  payoutId: a.pipe(a.string(), a.trim(), a.minLength(1, "Cannot be empty")),
  status: a.picklist(["vorgemerkt", "ausgezahlt"]),
})

/**
 * Moves a recorded payout from `vorgemerkt` to `ausgezahlt` once the bank
 * transfer happened outside the platform. The transition stamps `paidAt`;
 * moving back is refused so the ledger stays monotonic.
 */
export const organizerDashboardPayoutStatusUpdateMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    payoutId: v.string(),
    status: v.union(v.literal("vorgemerkt"), v.literal("ausgezahlt")),
  },
  handler: (ctx, args): PromiseResult<{ readonly payoutId: Id<"organizerDashboardPayouts"> }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, payoutId, status }) => {
      const op = "organizerDashboardPayoutStatusUpdateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "finanzen.sehen")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardPayoutStatusUpdateSchema, {
        orgId: String(orgId),
        payoutId,
        status,
      })
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      let existing = null
      try {
        existing = await ctx.db.get(
          "organizerDashboardPayouts",
          parsed.output.payoutId as Id<"organizerDashboardPayouts">,
        )
      } catch {
        return createResultError(op, "Auszahlung nicht verfügbar")
      }
      if (!existing || existing.orgId !== orgId) return createResultError(op, "Auszahlung nicht verfügbar")
      if (existing.status === parsed.output.status) return createResult({ payoutId: existing._id })
      if (existing.status !== "vorgemerkt" || parsed.output.status !== "ausgezahlt") {
        return createResultError(op, "Auszahlung kann nicht zurückgesetzt werden")
      }
      const at = new Date().toISOString()
      await ctx.db.patch(existing._id, { status: "ausgezahlt", paidAt: at, updatedAt: at })
      return createResult({ payoutId: existing._id })
    }),
})
