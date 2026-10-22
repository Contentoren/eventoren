import { paginationOptsValidator } from "convex/server"
import { v as convexV } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardTeamEmailNormalize } from "#src/organizer/dashboard/team/organizerDashboardTeamEmailNormalize.ts"
import type { OrganizerDashboardTeamInvitation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationSchema.ts"
import { organizerDashboardTeamInvitationStatusEffective } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationStatusEffective.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50

/**
 * Authenticated inbox of the team invitations that were sent to the account
 * e-mail of the signed-in user.
 *
 * The lookup uses the indexed `invitedEmail` range of the invitation table, so
 * no roster of other invitations is read. The account e-mail is the canonical
 * source; the query never trusts an address from the request.
 */
export const organizerDashboardTeamInvitationInboxQuery = query({
  args: {
    token: convexV.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardTeamInvitation[]
    readonly isDone: boolean
    readonly continueCursor: string
    readonly accountEmail: string | null
  }> =>
    authQueryTokenToUserId(
      ctx,
      args,
      async (
        queryCtx,
        { userId, paginationOpts },
      ): PromiseResult<{
        readonly page: readonly OrganizerDashboardTeamInvitation[]
        readonly isDone: boolean
        readonly continueCursor: string
        readonly accountEmail: string | null
      }> => {
        const op = "organizerDashboardTeamInvitationInboxQuery"
        const pageSize = paginationOpts.numItems
        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
          return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
        }
        const user = await queryCtx.db.get("users", userId)
        if (!user) return createResultError(op, "Konto nicht gefunden.")
        const accountEmail = user.email ?? null
        if (!accountEmail) {
          return createResult({ page: [], isDone: true, continueCursor: "", accountEmail: null })
        }

        const invitations = await queryCtx.db
          .query("organizerDashboardTeamInvitations")
          .withIndex("invitedEmail", (q) => q.eq("invitedEmail", organizerDashboardTeamEmailNormalize(accountEmail)))
          .paginate(paginationOpts)
        const now = new Date()
        const page: OrganizerDashboardTeamInvitation[] = []
        for (const invitation of invitations.page) {
          const org = await queryCtx.db.get("orgs", invitation.orgId)
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
        return createResult({
          page,
          isDone: invitations.isDone,
          continueCursor: invitations.continueCursor,
          accountEmail,
        })
      },
    ),
})
