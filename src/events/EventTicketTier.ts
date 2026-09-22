export type EventTicketTier = {
  id: string
  name: string
  description: string
  priceCents: number
  feeCents: number
  capacity: number
  available: number
  sortOrder?: number
}
