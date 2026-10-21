import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

export const organizerDashboardGuestDeleteMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), guestId: v.id("organizerDashboardGuests") },
  handler: (ctx, args): PromiseResult<{ deleted: boolean }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, guestId }) => {
      const op = "organizerDashboardGuestDeleteMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const guest = await ctx.db.get("organizerDashboardGuests", guestId)
      if (!guest || guest.orgId !== orgId) return createResultError(op, "Gast nicht verfügbar")
      if (guest.orderId) return createResultError(op, "Gast mit Ticket kann nicht gelöscht werden")
      await ctx.db.delete(guestId)
      return createResult({ deleted: true })
    }),
})
