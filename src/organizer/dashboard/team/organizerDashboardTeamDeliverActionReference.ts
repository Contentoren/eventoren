import { organizerDashboardTeamFunctionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamFunctionReference.ts"
import type { organizerDashboardTeamInvitationDeliverAction } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationDeliverAction.ts"

/**
 * Internal reference of the invitation delivery action.
 * The action module is only imported as a type, so the scheduled function does
 * not pull the action into the mutation bundle.
 */
export const organizerDashboardTeamDeliverActionReference = organizerDashboardTeamFunctionReference<
  typeof organizerDashboardTeamInvitationDeliverAction
>("organizerDashboardTeam:organizerDashboardTeamInvitationDeliverAction")
