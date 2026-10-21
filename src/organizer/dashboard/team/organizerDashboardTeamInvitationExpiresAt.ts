const organizerDashboardTeamInvitationLifetimeMs = 14 * 24 * 60 * 60 * 1000

/** Expiry of a new team invitation: 14 days from creation (stored in UTC). */
export function organizerDashboardTeamInvitationExpiresAt(now: Date): string {
  return new Date(now.getTime() + organizerDashboardTeamInvitationLifetimeMs).toISOString()
}
