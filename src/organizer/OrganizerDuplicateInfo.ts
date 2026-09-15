export type OrganizerDuplicateInfo = {
  readonly ticketNumber: string
  readonly previousCheckedInAt: string
  readonly previousOperator: string
  readonly participantName: string
  readonly buyerName: string
  readonly buyerEmail: string
  readonly elapsedMilliseconds: number | null
}
