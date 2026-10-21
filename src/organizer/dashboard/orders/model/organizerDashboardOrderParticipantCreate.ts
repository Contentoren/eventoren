import type { Doc } from "#convex/_generated/dataModel.js"

/** Entry-role projection: no buyer, order reference, prices or capability code. */
export function organizerDashboardOrderParticipantCreate(ticket: Doc<"ticketIssued">) {
  return {
    ticketId: ticket._id,
    sequence: ticket.sequence,
    tierName: ticket.tierName,
    participantName: ticket.participantName ?? "",
    participantEmail: ticket.participantEmail ?? "",
    checkedInAt: ticket.checkedInAt ?? null,
    cancelled: ticket.cancelled ?? false,
    issuedAt: ticket.issuedAt,
  }
}
export type OrganizerDashboardOrderParticipant = ReturnType<typeof organizerDashboardOrderParticipantCreate>
