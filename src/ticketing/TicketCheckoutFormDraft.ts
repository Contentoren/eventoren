import type { TicketContact } from "./TicketContact.ts"
import type { TicketParticipantNames } from "./TicketParticipantNames.ts"

export type TicketCheckoutFormDraft = {
  contact: TicketContact
  participantNames: TicketParticipantNames
  documentSetRevision: string
}
