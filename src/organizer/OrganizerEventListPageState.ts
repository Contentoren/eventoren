import type { OrganizerEventGroup } from "./OrganizerEventGroup.ts"
import type { OrganizerText } from "./OrganizerText.ts"

export type OrganizerEventListPageState = {
  readonly groups: () => readonly OrganizerEventGroup[]
  readonly text: () => OrganizerText
  readonly loading: () => boolean
  readonly errorMessage: () => string
  readonly eventTime: (value: string) => string
}
