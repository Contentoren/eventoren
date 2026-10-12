import type { TicketActivationCodeStatus } from "./TicketActivationCodeStatus.ts"

export type TicketActivationCode = {
  readonly id: string
  readonly number: number
  readonly code: string
  readonly status: TicketActivationCodeStatus
  readonly orderId: string | null
  readonly orderBookingReference: string | null
  readonly orderBookingNumber: number | null
  readonly customerEmail: string | null
  readonly customerGivenName: string | null
  readonly customerFamilyName: string | null
  readonly createdAt: string
  readonly updatedAt: string
}
