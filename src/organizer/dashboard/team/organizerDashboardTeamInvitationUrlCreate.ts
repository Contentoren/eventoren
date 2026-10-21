import { organizerDashboardTeamInvitationPath } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationPath.ts"

/**
 * Link of the invitation mail. It points to the authenticated inbox; the
 * invitation id in the query is only a hint for the view, the server checks
 * the signed-in account e-mail before anything is granted.
 */
export function organizerDashboardTeamInvitationUrlCreate(baseUrl: string, invitationId: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  return `${normalizedBase}${organizerDashboardTeamInvitationPath}?einladung=${encodeURIComponent(invitationId)}`
}
