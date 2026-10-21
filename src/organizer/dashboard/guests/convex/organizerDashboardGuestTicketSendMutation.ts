import { v } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "../../convex/organizerDashboardAuthorize.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

function organizerDashboardGuestTicketCodeCreate(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  let code = ""
  for (const byte of bytes) code += alphabet[byte % alphabet.length]
  return `GAST-${code.slice(0, 4)}-${code.slice(4)}`
}

/**
 * Sends a free ticket to a guest via a zero-total order. The order carries a
 * `channel: "gaesteliste"` marker in its checkout context so finance keeps
 * excluding guest-list sales from revenue; all totals stay 0, no fee, no
 * payment provider. One ticket per seat (guest + plusOnes).
 */
export const organizerDashboardGuestTicketSendMutation = mutation({
  args: { orgId: v.id("orgs"), token: v.string(), guestId: v.id("organizerDashboardGuests") },
  handler: (ctx, args): PromiseResult<{ orderId: string; tickets: number }> =>
    authMutationTokenToUserId(ctx, args, async (ctx, { userId, orgId, guestId }) => {
      const op = "organizerDashboardGuestTicketSendMutation"
      const auth = await organizerDashboardAuthorize(ctx, userId, orgId, "gaesteliste.bearbeiten")
      if (!auth.success) return auth
      const guest = await ctx.db.get("organizerDashboardGuests", guestId)
      if (!guest || guest.orgId !== orgId) return createResultError(op, "Gast nicht verfügbar")
      if (guest.orderId) return createResultError(op, "Ticket wurde bereits gesendet")
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", guest.eventKey))
        .unique()
      if (!event || event.orgId !== orgId) return createResultError(op, "Veranstaltung nicht verfügbar")
      const now = new Date().toISOString()
      const seats = 1 + guest.plusOnes
      const orderId = await ctx.db.insert("ticketOrders", {
        checkoutKey: `gaesteliste-${guest._id}-${now}`,
        customerEmail: guest.email ?? "",
        customerGivenName: guest.name,
        contactSnapshotJson: JSON.stringify({
        channel: "gaesteliste",
        guestId: String(guest._id),
        email: guest.email ?? "",
        givenName: guest.name,
      }),
        eventKey: event.eventKey,
        eventTitle: event.title,
        eventSubtitle: event.subtitle,
        eventDescription: event.description,
        eventStartsAt: event.startsAt,
        eventEndsAt: event.endsAt,
        eventDoorsAt: event.doorsAt,
        venue: event.venue,
        city: event.city,
        address: event.address,
        organizer: event.organizer,
        imageUrl: event.imageUrl,
        imageAlt: event.imageAlt,
        catalogVersion: event.catalogVersion,
        subtotalCents: 0,
        feeCents: 0,
        totalCents: 0,
        checkoutContextJson: JSON.stringify({ channel: "gaesteliste", guestId: String(guest._id) }),
        orgId,
        paymentReference: `gaesteliste-${guest._id}`,
        stripeMode: "test",
        status: "paid",
        paymentStatus: "paid",
        reservationExpiresAt: Date.now(),
        createdAt: now,
        updatedAt: now,
        paidAt: now,
        ticketsIssuedAt: now,
      })
      for (let sequence = 0; sequence < seats; sequence++) {
        await ctx.db.insert("ticketIssued", {
          orderId,
          sequence,
          code: organizerDashboardGuestTicketCodeCreate(),
          eventKey: event.eventKey,
          eventTitle: event.title,
          eventStartsAt: event.startsAt,
          eventDoorsAt: event.doorsAt,
          venue: event.venue,
          city: event.city,
          address: event.address,
          tierKey: "gaesteliste",
          tierName: "Gästeliste",
          priceCents: 0,
          feeCents: 0,
          participantName: sequence === 0 ? guest.name : `${guest.name} (+${sequence})`,
          ...(guest.email ? { participantEmail: guest.email } : {}),
          issuedAt: now,
        })
      }
      await ctx.db.patch("organizerDashboardGuests", guestId, { orderId, updatedAt: now })
      return createResult({ orderId: String(orderId), tickets: seats })
    }),
})
