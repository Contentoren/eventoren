import type { EventCategory } from "../../events/EventCategory.ts"
import type { EventImageVariants } from "../../events/EventImageVariants.ts"
import type { EventHighlight } from "../../events/EventHighlight.ts"

export type CatalogEventUpsertInput = {
  readonly eventKey: string
  readonly title: string
  readonly subtitle: string
  readonly description: string
  readonly category: EventCategory
  readonly startsAt: string
  readonly endsAt: string
  readonly doorsAt: string
  readonly venue: string
  readonly city: string
  readonly address: string
  readonly organizer: string
  readonly imageUrl: string
  readonly imageVariants?: EventImageVariants
  readonly imageAlt: string
  readonly tags: string[]
  readonly highlights: EventHighlight[]
  readonly inclusions?: string[]
  readonly exclusions?: string[]
  readonly status?: "draft" | "published" | "archived"
  readonly token: string
}
