import type { Doc } from "#convex/_generated/dataModel.js"

export function organizerTicketCheckInHistoryProjectionCreate(history: Doc<"ticketCheckInHistory">) {
  return {
    id: history._id,
    ticketId: history.ticketId,
    orderId: history.orderId,
    eventKey: history.eventKey,
    ticketNumber: history.ticketNumber,
    action: history.action,
    occurredAt: history.occurredAt,
    checkInAt: history.checkInAt,
    operatorId: history.operatorId,
    operatorName: history.operatorName,
    participantName: history.participantName,
    buyerName: history.buyerName,
    buyerEmail: history.buyerEmail,
  }
}
