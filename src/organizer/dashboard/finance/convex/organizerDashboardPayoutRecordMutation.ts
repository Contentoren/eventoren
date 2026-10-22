import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { organizerDashboardPayoutRecordSchema } from "../organizerDashboardFinanceFilterSchema.ts"
import { organizerDashboardFinanceEventScopeGet } from "./organizerDashboardFinanceEventScopeGet.ts"
import { organizerDashboardFinanceEventStatsRead } from "./organizerDashboardFinanceEventStatsRead.ts"

/**
 * Records a payout (Auszahlung) for one event. The amount must not exceed the
 * remaining settlement payout; money movement itself happens outside the
 * platform (bank transfer to the organizer IBAN), so no payment provider is
 * simulated here.
 */
export const organizerDashboardPayoutRecordMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    eventKey: v.string(),
    amountCents: v.number(),
    note: v.optional(v.string()),
  },
  handler: (ctx, args): PromiseResult<{ payoutId: Id<"organizerDashboardPayouts"> }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, amountCents, note }) => {
      const op = "organizerDashboardPayoutRecordMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "finanzen.sehen")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardPayoutRecordSchema, {
        orgId: String(orgId),
        eventKey,
        amountCents,
        ...(note !== undefined ? { note } : {}),
      })
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const scope = await organizerDashboardFinanceEventScopeGet(ctx, orgId, parsed.output.eventKey, op)
      if (!scope.success) return scope
      const stats = await organizerDashboardFinanceEventStatsRead(ctx, orgId, scope.data.event)
      if (stats.truncated) return createResultError(op, "Abrechnung unvollständig, bitte erneut versuchen")
      if (parsed.output.amountCents > stats.remainingPayoutCents) {
        return createResultError(op, "Betrag übersteigt die offene Auszahlung")
      }
      const at = new Date().toISOString()
      const payoutId = await ctx.db.insert("organizerDashboardPayouts", {
        orgId,
        eventKey: parsed.output.eventKey,
        amountCents: parsed.output.amountCents,
        status: "vorgemerkt",
        ...(parsed.output.note !== undefined ? { note: parsed.output.note } : {}),
        decidedByUserId: userId,
        decidedAt: at,
        createdAt: at,
        updatedAt: at,
      })
      return createResult({ payoutId })
    }),
})
