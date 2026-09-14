import type { EventCategory } from "../../events/EventCategory.ts"

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
  readonly imageAlt: string
  readonly tags: string[]
  readonly status?: "draft" | "published" | "archived"
  readonly token: string
}
