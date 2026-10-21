import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardTeamMemberCreate } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberCreate.ts"
import type { OrganizerDashboardTeamMember } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberSchema.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"

const maxPageSize = 50

/**
 * Bounded list of the organization members with their team role.
 * Requires `team.verwalten`; members without a team role stay visible because
 * team management never removes their canonical membership.
 */
export const organizerDashboardTeamMemberListQuery = query({
  args: {
    token: v.string(),
    orgId: v.id("orgs"),
    paginationOpts: paginationOptsValidator,
  },
  handler: (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardTeamMember[]
    readonly isDone: boolean
    readonly continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId, paginationOpts }) => {
      const op = "organizerDashboardTeamMemberListQuery"
      const authorization = await organizerDashboardAuthorize(queryCtx, userId, orgId, "team.verwalten")
      if (!authorization.success) return authorization
      const pageSize = paginationOpts.numItems
      if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
        return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
      }
      const members = await queryCtx.db
        .query("orgMembers")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .paginate(paginationOpts)
      const page: OrganizerDashboardTeamMember[] = []
      for (const member of members.page) {
        page.push(await organizerDashboardTeamMemberCreate(queryCtx, member))
      }
      return createResult({ page, isDone: members.isDone, continueCursor: members.continueCursor })
    }),
})
