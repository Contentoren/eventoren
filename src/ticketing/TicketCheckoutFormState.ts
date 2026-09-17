import type { Accessor } from "solid-js"
import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"
import type { TicketContact } from "./TicketContact.ts"
import type { TicketParticipantNames } from "./TicketParticipantNames.ts"
import type { TicketRequiredFieldKey } from "./TicketRequiredFieldKey.ts"

export type TicketCheckoutFormState = {
  contact: Accessor<TicketContact>
  step: Accessor<TicketCheckoutStep>
  stepIndex: Accessor<number>
  stepLabels: Accessor<readonly string[]>
  errorMessage: Accessor<string>
  isSubmitting: Accessor<boolean>
  submitAttempted: Accessor<boolean>
  isCartEmpty: Accessor<boolean>
  totalLabel: Accessor<string>
  legalAccepted: Accessor<boolean>
  participantNames: Accessor<TicketParticipantNames>
  isFieldInvalid: (key: TicketRequiredFieldKey) => boolean
  participantFields: Accessor<
    readonly {
      readonly eventId: string
      readonly eventTitle: string
      readonly tierId: string
      readonly tierName: string
      readonly ticketIndex: number
      readonly value: string
    }[]
  >
  legalAcceptanceChange: (accepted: boolean) => void
  contactFieldChange: (field: keyof TicketContact, value: string) => void
  participantNameChange: (eventId: string, tierId: string, ticketIndex: number, value: string) => void
  confirmPayment: () => Promise<void>
}
