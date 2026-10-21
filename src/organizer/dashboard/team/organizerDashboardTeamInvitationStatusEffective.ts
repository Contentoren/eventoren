import type { OrganizerDashboardTeamInvitationStatus } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusSchema.ts"

/**
 * Effective status of an invitation: a pending invitation whose expiry has
 * passed is expired, even though no background job wrote that status yet.
 */
export function organizerDashboardTeamInvitationStatusEffective(
  invitation: { readonly status: OrganizerDashboardTeamInvitationStatus; readonly expiresAt: string },
  now: Date,
): OrganizerDashboardTeamInvitationStatus {
  if (invitation.status === "pending" && Date.parse(invitation.expiresAt) <= now.getTime()) return "expired"
  return invitation.status
}
