import type { DatabaseReader } from "#convex/_generated/server.js"
import {
  organizerDashboardMessageAudienceCount,
  type OrganizerDashboardMessageRecipientTicket,
} from "../organizerDashboardMessageAudienceCount.ts"
import type { OrganizerDashboardMessageAudience } from "../organizerDashboardMessageSchema.ts"

/**
 * Counts live recipients for one audience over issued tickets. Bounded read:
 * at most 10.000 tickets per event are scanned, so the count stays honest on
 * large events instead of timing out.
 */
export async function organizerDashboardMessageRecipientsCount(
  ctx: { db: DatabaseReader },
  eventKey: string,
  audience: OrganizerDashboardMessageAudience,
): Promise<number> {
  const tickets = await ctx.db
    .query("ticketIssued")
    .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", eventKey))
    .take(10000)
  const shaped: OrganizerDashboardMessageRecipientTicket[] = tickets.map((ticket) => ({
    tierKey: ticket.tierKey,
    cancelled: ticket.cancelled ?? false,
    checkedInAt: ticket.checkedInAt ?? null,
  }))
  return organizerDashboardMessageAudienceCount(audience, shaped)
}
