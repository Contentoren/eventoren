import type { EventCategory } from "../events/EventCategory.ts"
import type { EventImageVariants } from "../events/EventImageVariants.ts"

export type AdminEventDraft = {
  eventKey: string
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
  tags: string
  status: "draft" | "published" | "archived"
}
