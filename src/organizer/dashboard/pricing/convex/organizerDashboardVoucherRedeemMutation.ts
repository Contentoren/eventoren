import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardCodeNormalize } from "#src/organizer/dashboard/pricing/organizerDashboardCodeNormalize.ts"
import { organizerDashboardVoucherRedeemSchema } from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/**
 * Atomically redeems part of an organization voucher against an order
 * reference. The mutation runs in one Convex transaction: balance check,
 * balance decrement, status flip to `eingeloest` at zero, and the ledger row
 * are applied together, so concurrent redemptions cannot overspend. Money
 * movement itself happens outside the platform; this is the ledger.
 */
export const organizerDashboardVoucherRedeemMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), code: v.string(), amountCents: v.number(), orderRef: v.string() },
  handler: (
    ctx,
    args,
  ): PromiseResult<{ readonly voucherId: Id<"organizerDashboardVouchers">; readonly balanceCents: number }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, code, amountCents, orderRef }) => {
      const op = "organizerDashboardVoucherRedeemMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gutscheine.bearbeiten")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardVoucherRedeemSchema, {
        orgId: String(orgId),
        code,
        amountCents,
        orderRef,
      })
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      const normalized = organizerDashboardCodeNormalize(parsed.output.code)
      const voucher = await ctx.db
        .query("organizerDashboardVouchers")
        .withIndex("orgIdAndCode", (q) => q.eq("orgId", orgId).eq("code", normalized))
        .unique()
      if (!voucher) return createResultError(op, "Gutschein nicht verfügbar")
      if (voucher.status !== "aktiv") return createResultError(op, "Gutschein ist nicht aktiv")
      const now = new Date().toISOString()
      if (voucher.expiresAt !== undefined && voucher.expiresAt < now) {
        return createResultError(op, "Gutschein ist abgelaufen")
      }
      if (voucher.balanceCents < parsed.output.amountCents) {
        return createResultError(op, "Guthaben reicht nicht aus")
      }
      const balanceCents = voucher.balanceCents - parsed.output.amountCents
      await ctx.db.patch(voucher._id, {
        balanceCents,
        ...(balanceCents === 0 ? { status: "eingeloest" } : {}),
        updatedAt: now,
      })
      await ctx.db.insert("organizerDashboardVoucherRedemptions", {
        orgId,
        voucherId: voucher._id,
        code: voucher.code,
        orderRef: parsed.output.orderRef,
        amountCents: parsed.output.amountCents,
        redeemedByUserId: userId,
        createdAt: now,
      })
      return createResult({ voucherId: voucher._id, balanceCents })
    }),
})
