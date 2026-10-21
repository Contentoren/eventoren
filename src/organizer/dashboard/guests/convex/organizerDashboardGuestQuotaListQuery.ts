import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

export type OrganizerDashboardGuestQuotaSummary = {
  quotaId: Id<"organizerDashboardGuestQuotas">
  name: string
  limit: number
  seats: number
  guests: number
}

export const organizerDashboardGuestQuotaListQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), eventKey: v.string() },
  handler: (ctx, args): PromiseResult<{ quotas: OrganizerDashboardGuestQuotaSummary[] }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey }) => {
      const op = "organizerDashboardGuestQuotaListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const trimmed = eventKey.trim()
      if (trimmed.length === 0) return createResultError(op, "Veranstaltung fehlt")
      const quotas = await ctx.db
        .query("organizerDashboardGuestQuotas")
        .withIndex("orgIdAndEventKey", (q) => q.eq("orgId", orgId).eq("eventKey", trimmed))
        .collect()
      const guests = await ctx.db
        .query("organizerDashboardGuests")
        .withIndex("orgIdAndEventKey", (q) => q.eq("orgId", orgId).eq("eventKey", trimmed))
        .collect()
      return createResult({
        quotas: quotas.map((quota) => {
          const entries = guests.filter((guest) => guest.quotaId === quota._id)
          return {
            quotaId: quota._id,
            name: quota.name,
            limit: quota.limit,
            guests: entries.length,
            seats: entries.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0),
          }
        }),
      })
    }),
})
