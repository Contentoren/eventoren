export type CatalogTicketTierUpsertInput = {
  readonly eventKey: string
  readonly tierKey: string
  readonly name: string
  readonly description: string
  readonly startsAt: string
  readonly doorsAt: string
  readonly additionalDoorsAt?: string[]
  readonly endsAt: string
  readonly priceCents: number
  readonly feeCents: number
  readonly capacity: number
  readonly sortOrder?: number
  readonly token: string
}
