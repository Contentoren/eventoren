import { organizerDashboardTeamFunctionReference } from "../team/organizerDashboardTeamFunctionReference.ts"
import type { organizerDashboardTeamInvitationAcceptMutation } from "../team/organizerDashboardTeamInvitationAcceptMutation.ts"
import type { organizerDashboardTeamInvitationInboxQuery } from "../team/organizerDashboardTeamInvitationInboxQuery.ts"
import type { organizerDashboardTeamInvitationListQuery } from "../team/organizerDashboardTeamInvitationListQuery.ts"
import type { organizerDashboardTeamInvitationResendMutation } from "../team/organizerDashboardTeamInvitationResendMutation.ts"
import type { organizerDashboardTeamInvitationRevokeMutation } from "../team/organizerDashboardTeamInvitationRevokeMutation.ts"
import type { organizerDashboardTeamInviteMutation } from "../team/organizerDashboardTeamInviteMutation.ts"
import type { organizerDashboardTeamMemberListQuery } from "../team/organizerDashboardTeamMemberListQuery.ts"
import type { organizerDashboardTeamMemberRemoveMutation } from "../team/organizerDashboardTeamMemberRemoveMutation.ts"
import type { organizerDashboardTeamRoleUpdateMutation } from "../team/organizerDashboardTeamRoleUpdateMutation.ts"

/** Canonical references derived from backend exports until the parent refreshes generated API types. */
export const organizerDashboardTeamReferences = {
  organizerDashboardTeamMemberListQuery: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamMemberListQuery
  >("organizerDashboardTeam:organizerDashboardTeamMemberListQuery"),
  organizerDashboardTeamInvitationListQuery: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamInvitationListQuery
  >("organizerDashboardTeam:organizerDashboardTeamInvitationListQuery"),
  organizerDashboardTeamInviteMutation: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamInviteMutation
  >("organizerDashboardTeam:organizerDashboardTeamInviteMutation"),
  organizerDashboardTeamRoleUpdateMutation: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamRoleUpdateMutation
  >("organizerDashboardTeam:organizerDashboardTeamRoleUpdateMutation"),
  organizerDashboardTeamMemberRemoveMutation: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamMemberRemoveMutation
  >("organizerDashboardTeam:organizerDashboardTeamMemberRemoveMutation"),
  organizerDashboardTeamInvitationRevokeMutation: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamInvitationRevokeMutation
  >("organizerDashboardTeam:organizerDashboardTeamInvitationRevokeMutation"),
  organizerDashboardTeamInvitationResendMutation: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamInvitationResendMutation
  >("organizerDashboardTeam:organizerDashboardTeamInvitationResendMutation"),
  organizerDashboardTeamInvitationInboxQuery: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamInvitationInboxQuery
  >("organizerDashboardTeam:organizerDashboardTeamInvitationInboxQuery"),
  organizerDashboardTeamInvitationAcceptMutation: organizerDashboardTeamFunctionReference<
    typeof organizerDashboardTeamInvitationAcceptMutation
  >("organizerDashboardTeam:organizerDashboardTeamInvitationAcceptMutation"),
}
