import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

export const organizerDashboardGuestQuotaDeleteMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), quotaId: v.id("organizerDashboardGuestQuotas") },
  handler: (ctx, args): PromiseResult<{ deleted: boolean }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, quotaId }) => {
      const op = "organizerDashboardGuestQuotaDeleteMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const quota = await ctx.db.get("organizerDashboardGuestQuotas", quotaId)
      if (!quota || quota.orgId !== orgId) return createResultError(op, "Kontingent nicht verfügbar")
      const assigned = await ctx.db
        .query("organizerDashboardGuests")
        .withIndex("quotaId", (q) => q.eq("quotaId", quotaId))
        .take(1)
      if (assigned.length > 0) return createResultError(op, "Kontingent ist belegt und kann nicht gelöscht werden")
      await ctx.db.delete(quotaId)
      return createResult({ deleted: true })
    }),
})
