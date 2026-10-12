import type { EventAdmissionRange } from "../../events/EventAdmissionRange.ts"

export type CatalogTicketTierUpsertInput = {
  readonly eventKey: string
  readonly tierKey: string
  readonly name: string
  readonly description: string
  readonly startsAt: string
  readonly doorsAt: string
  readonly additionalDoorsAt?: EventAdmissionRange[]
  readonly endsAt: string
  readonly priceCents: number
  readonly feeCents: number
  readonly capacity: number
  readonly maxPerOrder?: number
  readonly activationCodeRequired?: boolean
  readonly sortOrder?: number
  readonly token: string
}
