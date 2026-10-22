import { v } from "convex/values"
import * as a from "valibot"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

const organizerDashboardGuestCheckInSchema = a.object({
  entrance: a.pipe(a.string(), a.trim(), a.minLength(1, "Eingang fehlt"), a.maxLength(120, "Eingang zu lang")),
})

export const organizerDashboardGuestCheckInMutation = mutation({
  args: {
    orgId: v.id("orgs"),
    token: v.string(),
    guestId: v.id("organizerDashboardGuests"),
    entrance: v.string(),
  },
  handler: (ctx, args): PromiseResult<{ checkedInAt: string }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, guestId, entrance }) => {
      const op = "organizerDashboardGuestCheckInMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const parsed = a.safeParse(organizerDashboardGuestCheckInSchema, { entrance })
      if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
      const guest = await ctx.db.get("organizerDashboardGuests", guestId)
      if (!guest || guest.orgId !== orgId) return createResultError(op, "Gast nicht verfügbar")
      const now = new Date().toISOString()
      await ctx.db.patch("organizerDashboardGuests", guestId, {
        checkedInAt: now,
        entrance: parsed.output.entrance,
        updatedAt: now,
      })
      if (guest.orderId) {
        const tickets = await ctx.db
          .query("ticketIssued")
          .withIndex("orderIdAndSequence", (q) => q.eq("orderId", guest.orderId!))
          .collect()
        for (const ticket of tickets) {
          if (!ticket.checkedInAt) await ctx.db.patch("ticketIssued", ticket._id, { checkedInAt: now })
        }
      }
      return createResult({ checkedInAt: now })
    }),
})

export const organizerDashboardGuestCheckInUndoMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), guestId: v.id("organizerDashboardGuests") },
  handler: (ctx, args): PromiseResult<{ undone: boolean }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, guestId }) => {
      const op = "organizerDashboardGuestCheckInUndoMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const guest = await ctx.db.get("organizerDashboardGuests", guestId)
      if (!guest || guest.orgId !== orgId) return createResultError(op, "Gast nicht verfügbar")
      const now = new Date().toISOString()
      await ctx.db.patch("organizerDashboardGuests", guestId, {
        checkedInAt: undefined,
        entrance: undefined,
        updatedAt: now,
      })
      return createResult({ undone: true })
    }),
})
