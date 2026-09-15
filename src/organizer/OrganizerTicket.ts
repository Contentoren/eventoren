import type { Id } from "#convex/_generated/dataModel.js"

export type OrganizerTicket = {
  readonly id: Id<"ticketIssued">
  readonly ticketNumber: string
  readonly code: string
  readonly sequence: number
  readonly eventId: string
  readonly eventKey: string
  readonly eventTitle: string
  readonly imageUrl: string
  readonly imageAlt: string
  readonly eventStartsAt: string
  readonly eventEndsAt: string
  readonly eventDoorsAt: string
  readonly tierKey: string
  readonly tierName: string
  readonly priceCents: number
  readonly priceEur: number
  readonly feeCents: number
  readonly participantName: string
  readonly participantNameSource: "participant" | "buyer"
  readonly buyerName: string
  readonly buyerGivenName: string
  readonly buyerFamilyName: string
  readonly buyerEmail: string
  readonly paymentStatus: string
  readonly orderStatus: string
  readonly cancelled: boolean
  readonly checkedIn: boolean
  readonly checkedInAt: string | null
  readonly checkedInBy: string | null
  readonly checkedInByName: string | null
  readonly checkIn: {
    readonly status: "checked-in" | "not-checked-in"
    readonly at: string | null
    readonly operatorId: string | null
    readonly operatorName: string | null
  }
  readonly issuedAt: string
}
