import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import type { OrganizerDashboardPermission } from "#src/organizer/dashboard/model/organizerDashboardPermissionSchema.ts"

export type OrganizerDashboardEventAuth = {
  orgId: Id<"orgs">
  role: string
  permissions: OrganizerDashboardPermission[]
  org: Doc<"orgs">
  membership: Doc<"orgMembers">
  organization: Doc<"organizerDashboardOrganizations">
}

export async function organizerDashboardEventAuthGet(
  ctx: QueryCtx | MutationCtx,
  userId: IdUser,
  orgId: Id<"orgs">,
  permission: OrganizerDashboardPermission,
): PromiseResult<OrganizerDashboardEventAuth> {
  const authorization = await organizerDashboardAuthorize(ctx, userId, orgId, permission)
  if (!authorization.success) return authorization
  return createResult({ ...authorization.data, orgId })
}
