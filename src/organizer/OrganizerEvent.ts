export type OrganizerEvent = {
  readonly id: string
  readonly eventKey: string
  readonly title: string
  readonly imageUrl: string
  readonly imageAlt: string
  readonly startsAt: string
  readonly endsAt: string
  readonly doorsAt: string
  readonly status: "draft" | "published" | "archived"
}
