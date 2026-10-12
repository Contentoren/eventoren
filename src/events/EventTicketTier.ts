import type { EventAdmissionRange } from "./EventAdmissionRange.ts"

export type EventTicketTier = {
  id: string
  name: string
  description: string
  startsAt?: string
  doorsAt?: string
  additionalDoorsAt?: EventAdmissionRange[]
  endsAt?: string
  priceCents: number
  feeCents: number
  capacity: number
  available: number
  maxPerOrder?: number
  activationCodeRequired?: boolean
  sold?: number
  sortOrder?: number
}
