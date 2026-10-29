export interface AdminEventOverviewPanelProps {
  readonly id: string
  readonly eventTitle: string
  readonly archived: boolean
  /** Only supply complete totals, never a partially aggregated page. */
  readonly summary:
    | {
        readonly paidValidTicketCount: number
        readonly distinctBuyerCount: number
        readonly capacity?: number | null
      }
    | undefined
  readonly loading: boolean
  readonly errorMessage?: string
  readonly actionErrorMessage?: string
  readonly duplicatePending: boolean
  readonly archivePending: boolean
  readonly onBookings: () => void
  readonly onEdit: () => void
  readonly onDuplicate: () => void
  readonly onArchive: () => void
}
