import * as a from "valibot"
import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardVoucherDeactivateSchema } from "#src/organizer/dashboard/pricing/organizerDashboardVoucherSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

/** Deactivates an active voucher; remaining balance stays visible in history. */
export const organizerDashboardVoucherDeactivateMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), voucherId: v.string() },
  handler: (ctx, args): PromiseResult<{ readonly voucherId: Id<"organizerDashboardVouchers"> }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, voucherId }) => {
      const op = "organizerDashboardVoucherDeactivateMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gutscheine.bearbeiten")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardVoucherDeactivateSchema, { orgId: String(orgId), voucherId })
      if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
      let existing = null
      try {
        existing = await ctx.db.get(
          "organizerDashboardVouchers",
          parsed.output.voucherId as Id<"organizerDashboardVouchers">,
        )
      } catch {
        return createResultError(op, "Gutschein nicht verfügbar")
      }
      if (!existing || existing.orgId !== orgId) return createResultError(op, "Gutschein nicht verfügbar")
      if (existing.status !== "aktiv") return createResultError(op, "Gutschein ist nicht aktiv")
      await ctx.db.patch(existing._id, { status: "deaktiviert", updatedAt: new Date().toISOString() })
      return createResult({ voucherId: existing._id })
    }),
})
