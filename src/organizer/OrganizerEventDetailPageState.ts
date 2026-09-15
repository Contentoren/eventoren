import type { OrganizerDuplicateInfo } from "./OrganizerDuplicateInfo.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerScannerOutcome } from "./OrganizerScannerOutcome.ts"
import type { OrganizerText } from "./OrganizerText.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"

export type OrganizerEventDetailPageState = {
  readonly event: () => OrganizerEvent | undefined
  readonly tickets: () => readonly OrganizerTicket[]
  readonly selectedTicket: () => OrganizerTicket | undefined
  readonly selectedTicketId: () => string
  readonly search: () => string
  readonly text: () => OrganizerText
  readonly loading: () => boolean
  readonly actionPending: () => boolean
  readonly errorMessage: () => string
  readonly successMessage: () => string
  readonly duplicateInfo: () => OrganizerDuplicateInfo | null
  readonly searchChange: (value: string) => void
  readonly ticketSelect: (ticket: OrganizerTicket) => void
  readonly ticketCheckIn: () => Promise<void>
  readonly ticketReset: () => Promise<void>
  readonly currency: (priceCents: number) => string
  readonly dateTime: (value: string | null) => string
  readonly elapsed: (milliseconds: number | null) => string
  readonly scannerActive: () => boolean
  readonly scannerStarting: () => boolean
  readonly scannerCheckingIn: () => boolean
  readonly scannerErrorMessage: () => string
  readonly scannerOutcome: () => OrganizerScannerOutcome | null
  readonly scannerVideoSet: (element: HTMLVideoElement) => void
  readonly scannerStart: () => Promise<void>
  readonly scannerStop: () => void
  readonly scannerCodeSimulate: (code: string) => Promise<void>
  readonly scannerPermissionDeniedSimulate: () => void
}
