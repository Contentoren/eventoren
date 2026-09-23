export type EventTicketTier = {
  id: string
  name: string
  description: string
  startsAt?: string
  doorsAt?: string
  additionalDoorsAt?: string[]
  endsAt?: string
  priceCents: number
  feeCents: number
  capacity: number
  available: number
  sold?: number
  sortOrder?: number
}
