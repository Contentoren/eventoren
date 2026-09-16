import type { OrganizerEvent } from "./OrganizerEvent.ts"

export type OrganizerEventListPage = {
  readonly page: readonly OrganizerEvent[]
  readonly isDone: boolean
  readonly continueCursor: string
}
