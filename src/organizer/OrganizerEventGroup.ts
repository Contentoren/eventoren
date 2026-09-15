import type { OrganizerEvent } from "./OrganizerEvent.ts"

export type OrganizerEventGroup = {
  readonly key: string
  readonly heading: string
  readonly events: readonly OrganizerEvent[]
}
