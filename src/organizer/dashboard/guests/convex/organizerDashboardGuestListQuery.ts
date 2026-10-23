import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

export type OrganizerDashboardGuestSummary = {
  guestId: Id<"organizerDashboardGuests">
  quotaId: Id<"organizerDashboardGuestQuotas"> | null
  quotaName: string | null
  name: string
  email: string | null
  plusOnes: number
  seats: number
  note: string | null
  ticketSent: boolean
  checkedInAt: string | null
  entrance: string | null
}

const organizerDashboardGuestListMaxRead = 5000

export const organizerDashboardGuestListQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), eventKey: v.string(), search: v.optional(v.string()) },
  handler: (ctx, args): PromiseResult<{ guests: OrganizerDashboardGuestSummary[]; truncated: boolean }> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, eventKey, search }) => {
      const op = "organizerDashboardGuestListQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const trimmed = eventKey.trim()
      if (trimmed.length === 0) return createResultError(op, "Veranstaltung fehlt")
      const quotas = await ctx.db
        .query("organizerDashboardGuestQuotas")
        .withIndex("orgIdAndEventKey", (q) => q.eq("orgId", orgId).eq("eventKey", trimmed))
        .take(organizerDashboardGuestListMaxRead)
      const names = new Map(quotas.map((quota) => [String(quota._id), quota.name]))
      const guests = await ctx.db
        .query("organizerDashboardGuests")
        .withIndex("orgIdAndEventKey", (q) => q.eq("orgId", orgId).eq("eventKey", trimmed))
        .take(organizerDashboardGuestListMaxRead + 1)
      const truncated = guests.length > organizerDashboardGuestListMaxRead
      const needle = (search ?? "").trim().toLowerCase()
      return createResult({
        truncated,
        guests: guests
          .slice(0, organizerDashboardGuestListMaxRead)
          .filter((guest) =>
            needle.length === 0 ? true : `${guest.name} ${guest.email ?? ""}`.toLowerCase().includes(needle),
          )
          .map((guest) => ({
            guestId: guest._id,
            quotaId: guest.quotaId ?? null,
            quotaName: guest.quotaId ? (names.get(String(guest.quotaId)) ?? null) : null,
            name: guest.name,
            email: guest.email ?? null,
            plusOnes: guest.plusOnes,
            seats: 1 + guest.plusOnes,
            note: guest.note ?? null,
            ticketSent: guest.orderId !== undefined,
            checkedInAt: guest.checkedInAt ?? null,
            entrance: guest.entrance ?? null,
          })),
      })
    }),
})
