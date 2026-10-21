import type { OrganizerDashboardRole } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"

/**
 * Result of claiming one invitation for a delivery attempt.
 * `skipped` reasons are stable slugs so they can be compared in tests.
 */
export type OrganizerDashboardTeamDeliveryClaimResult =
  | {
      readonly status: "claimed"
      readonly attempt: number
      readonly email: string
      readonly organizerRole: OrganizerDashboardRole
      readonly orgName: string
      readonly inviterName: string
      readonly inviterEmail: string | null
    }
  | { readonly status: "skipped"; readonly reason: string }
