import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { organizerDashboardOrderSummaryCreate } from "../model/organizerDashboardOrderSummaryCreate.ts"
import { organizerDashboardOrderParticipantCreate } from "../model/organizerDashboardOrderParticipantCreate.ts"
import type { OrganizerDashboardOrderDetail } from "../model/organizerDashboardOrderDetail.ts"
import { organizerDashboardOrderScopeGet } from "./organizerDashboardOrderScopeGet.ts"

export const organizerDashboardOrderGetQuery = query({
  args: { orgId: v.id("orgs"), token: v.string(), orderId: v.id("ticketOrders") },
  handler: (ctx, args): PromiseResult<OrganizerDashboardOrderDetail> =>
    authQueryTokenToUserId(ctx, args, async (ctx, { userId, orgId, orderId }) => {
      const op = "organizerDashboardOrderGetQuery"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "bestellungen.sehen")
      if (!auth.success) return auth
      const scoped = await organizerDashboardOrderScopeGet(ctx, orgId, orderId, op)
      if (!scoped.success) return scoped
      const order = scoped.data.order
      const lines = await ctx.db
        .query("ticketOrderLines")
        .withIndex("orderId", (q) => q.eq("orderId", orderId))
        .take(51)
      const tickets = await ctx.db
        .query("ticketIssued")
        .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
        .take(51)
      const notes = await ctx.db
        .query("organizerDashboardOrderNotes")
        .withIndex("orderIdAndCreatedAt", (q) => q.eq("orderId", orderId))
        .order("desc")
        .take(51)
      const c = order.operationalContact
      return createResult({
        ...organizerDashboardOrderSummaryCreate(order),
        historicalContact: {
          givenName: order.customerGivenName ?? "",
          familyName: order.customerFamilyName ?? "",
          email: order.customerEmail,
          phone: order.customerPhone ?? "",
          address: order.customerAddress ?? "",
        },
        operationalContact: c
          ? {
              ...(c.givenName === undefined ? {} : { givenName: c.givenName }),
              ...(c.familyName === undefined ? {} : { familyName: c.familyName }),
              ...(c.email === undefined ? {} : { email: c.email }),
              ...(c.phone === undefined ? {} : { phone: c.phone }),
            }
          : null,
        lines: lines
          .slice(0, 50)
          .filter((line) => line.eventKey === order.eventKey)
          .map((line) => ({
            lineId: line._id,
            tierName: line.tierName,
            quantity: line.quantity,
            priceCents: line.priceCents,
            feeCents: line.feeCents,
          })),
        tickets: tickets
          .slice(0, 50)
          .filter((ticket) => ticket.eventKey === order.eventKey)
          .map(organizerDashboardOrderParticipantCreate),
        notes: notes
          .slice(0, 50)
          .filter((note) => note.orgId === orgId && note.eventKey === order.eventKey)
          .map((note) => ({ noteId: note._id, text: note.text, createdAt: note.createdAt })),
        truncated: { lines: lines.length > 50, tickets: tickets.length > 50, notes: notes.length > 50 },
      })
    }),
})
