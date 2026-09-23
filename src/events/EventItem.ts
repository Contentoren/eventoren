import type { EventCategory } from "./EventCategory.ts"
import type { EventTicketTier } from "./EventTicketTier.ts"
import type { EventImageVariants } from "./EventImageVariants.ts"

export type EventItem = {
  id: string
  catalogVersion: number
  title: string
  subtitle: string
  description: string
  category: EventCategory
  startsAt: string
  endsAt: string
  doorsAt: string
  venue: string
  city: string
  address: string
  organizer: string
  imageUrl: string
  imageVariants?: EventImageVariants
  imageAlt: string
  tags: readonly string[]
  soldOut: boolean
  tiers: readonly EventTicketTier[]
}
