import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import type { OrganizerDashboardTeamInvitation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationSchema.ts"
import { organizerDashboardTeamInvitationStatusEffective } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusEffective.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50

/**
 * Bounded list of the open team invitations of one organization.
 * Requires `team.verwalten`; the invitation roster is never exposed to
 * accounts without the team permission.
 */
export const organizerDashboardTeamInvitationListQuery = query({
  args: {
    token: v.string(),
    orgId: v.id("orgs"),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardTeamInvitation[]
    readonly isDone: boolean
    readonly continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, paginationOpts }) => {
      const op = "organizerDashboardTeamInvitationListQuery"
      const authorization = await organizerDashboardAuthorize(queryCtx, userId, orgId, "team.verwalten")
      if (!authorization.success) return authorization
      const pageSize = paginationOpts.numItems
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
        return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
      }
      const invitations = await queryCtx.db
        .query("organizerDashboardTeamInvitations")
        .withIndex("orgIdAndStatus", (q) => q.eq("orgId", orgId).eq("status", "pending"))
        .paginate(paginationOpts)
      const org = await queryCtx.db.get("orgs", orgId)
      const now = new Date()
      const page: OrganizerDashboardTeamInvitation[] = []
      for (const invitation of invitations.page) {
        page.push({
          id: invitation._id,
          orgId: invitation.orgId,
          orgName: org?.name ?? org?.orgHandle ?? "Organisation",
          invitedEmail: invitation.invitedEmail,
          organizerRole: invitation.organizerRole,
          status: organizerDashboardTeamInvitationStatusEffective(invitation, now),
          deliveryState: invitation.deliveryState,
          deliveryAttempts: invitation.deliveryAttempts,
          deliveryReason: invitation.deliveryReason ?? null,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        })
      }
      return createResult({ page, isDone: invitations.isDone, continueCursor: invitations.continueCursor })
    }),
})
