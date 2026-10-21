import * as v from "valibot"
import { paginationOptsValidator } from "convex/server"
import { v as convexV } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { organizerDashboardOrganizationStatusSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationStatusSchema.ts"

const maxPageSize = 50

type OrganizerDashboardAdminListItem = {
  orgId: string
  name: string
  slug: string
  kind: string
  status: string
  configurationConfirmed: boolean
}

export const organizerDashboardAdminListQuery = query({
  args: {
    token: convexV.string(),
    paginationOpts: paginationOptsValidator,
    status: convexV.optional(convexV.string()),
  },
  handler: async (
    ctx,
    args,
  ): PromiseResult<{
    readonly page: readonly OrganizerDashboardAdminListItem[]
    readonly isDone: boolean
    readonly continueCursor: string
  }> =>
    authQueryTokenToUserId(ctx, args, async (authorizedCtx, { userId, paginationOpts, status }) => {
      const op = "organizerDashboardAdminListQuery"
      const authorization = await catalogAdminAuthorizeFn(authorizedCtx, userId)
      if (!authorization.success) return authorization
      if (
        !Number.isInteger(paginationOpts.numItems) ||
        paginationOpts.numItems < 1 ||
        paginationOpts.numItems > maxPageSize
      ) {
        return createResultError(op, `numItems must be an integer from 1 to ${maxPageSize}`)
      }
      let statusFilter: v.InferOutput<typeof organizerDashboardOrganizationStatusSchema> | undefined
      if (status !== undefined) {
        const parsed = v.safeParse(organizerDashboardOrganizationStatusSchema, status)
        if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
        statusFilter = parsed.output
      }
      const organizationQuery =
        statusFilter === undefined
          ? authorizedCtx.db.query("organizerDashboardOrganizations")
          : authorizedCtx.db
              .query("organizerDashboardOrganizations")
              .withIndex("status", (q) => q.eq("status", statusFilter))
      const organizationPage = await organizationQuery.paginate({
        ...paginationOpts,
        maximumRowsRead: maxPageSize,
        maximumBytesRead: 512 * 1024,
      })
      const page: OrganizerDashboardAdminListItem[] = organizationPage.page.map((organization) => ({
        orgId: organization.orgId,
        name: organization.profile.name,
        slug: organization.profile.slug,
        kind: organization.profile.kind,
        status: organization.status,
        configurationConfirmed: organization.configurationConfirmed,
      }))
      return createResult({
        page,
        isDone: organizationPage.isDone,
        continueCursor: organizationPage.continueCursor,
      })
    }),
})
