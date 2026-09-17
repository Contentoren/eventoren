import type { TicketRequiredFieldKey } from "./TicketRequiredFieldKey.ts"

export function ticketParticipantFieldKeyCreate(
  eventId: string,
  tierId: string,
  ticketIndex: number,
): TicketRequiredFieldKey {
  return `participant:${eventId}:${tierId}:${ticketIndex}`
}
