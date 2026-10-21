/**
 * Result of claiming one message for a delivery attempt.
 * `skipped` reasons are stable slugs so they can be compared in tests.
 */
export type OrganizerDashboardMessageDeliveryClaimResult =
  | {
      readonly status: "claimed"
      readonly attempt: number
      readonly subject: string
      readonly recipientCount: number
      readonly eventKey: string
    }
  | { readonly status: "skipped"; readonly reason: string }
