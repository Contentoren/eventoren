export type CustomerAccountTicket = {
  readonly ticketId: string
  readonly code: string
  readonly eventKey: string
  readonly eventTitle: string
  readonly eventStartsAt: string
  readonly venue: string
  readonly city: string
  readonly tierName: string
  readonly participantName: string
  readonly checkedInAt: string | null
  readonly cancelled: boolean
  readonly issuedAt: string
}

/**
 * Customer ticket projection. Excludes guest access digests, order internals
 * and capability codes; instants stay UTC, Berlin formatting happens in the UI.
 */
export function customerAccountTicketCreate(inputs: {
  readonly ticketId: string
  readonly code: string
  readonly eventKey: string
  readonly eventTitle: string
  readonly eventStartsAt: string
  readonly venue: string
  readonly city: string
  readonly tierName: string
  readonly participantName: string
  readonly checkedInAt?: string
  readonly cancelled?: boolean
  readonly issuedAt: string
}): CustomerAccountTicket {
  return {
    ticketId: inputs.ticketId,
    code: inputs.code,
    eventKey: inputs.eventKey,
    eventTitle: inputs.eventTitle,
    eventStartsAt: inputs.eventStartsAt,
    venue: inputs.venue,
    city: inputs.city,
    tierName: inputs.tierName,
    participantName: inputs.participantName,
    checkedInAt: inputs.checkedInAt ?? null,
    cancelled: inputs.cancelled === true,
    issuedAt: inputs.issuedAt,
  }
}
