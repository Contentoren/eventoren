import * as v from "valibot"
import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { OrganizerDashboardPermission } from "#src/organizer/dashboard/model/organizerDashboardPermissionSchema.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardPermissionsGet } from "#src/organizer/dashboard/model/organizerDashboardPermissionsGet.ts"

export async function organizerDashboardAuthorize(
  ctx: { db: DatabaseReader },
  userId: Id<"users">,
  orgId: Id<"orgs">,
  permission?: OrganizerDashboardPermission,
): PromiseResult<{
  role: v.InferOutput<typeof organizerDashboardRoleSchema>
  permissions: OrganizerDashboardPermission[]
  org: Doc<"orgs">
  membership: Doc<"orgMembers">
  organization: Doc<"organizerDashboardOrganizations">
}> {
  const op = "organizerDashboardAuthorize"
  const user = await ctx.db.get("users", userId)
  if (!user || user.deletedAt) return createResultError(op, "User not found")
  const memberships = await ctx.db
    .query("orgMembers")
    .withIndex("userIdOrgId", (q) => q.eq("userId", userId).eq("orgId", orgId))
    .take(2)
  if (memberships.length > 1) return createResultError(op, "Organization membership is ambiguous")
  const membership = memberships[0]
  if (!membership) return createResultError(op, "Organization membership required")
  if (!membership.organizerRole) return createResultError(op, "Organizer role required")
  const role = v.safeParse(organizerDashboardRoleSchema, membership.organizerRole)
  if (!role.success) return createResultError(op, "Unknown organizer role")
  const organization = await ctx.db
    .query("organizerDashboardOrganizations")
    .withIndex("orgId", (q) => q.eq("orgId", orgId))
    .unique()
  if (!organization) return createResultError(op, "Organization onboarding required")
  if (organization.status === "gesperrt") return createResultError(op, "Organization is blocked")
  const permissions = Array.from(organizerDashboardPermissionsGet(role.output))
  if (permission !== undefined && !permissions.includes(permission)) {
    return createResultError(op, "Permission denied")
  }
  const org = await ctx.db.get("orgs", orgId)
  if (!org) return createResultError(op, "Organization not found")
  return createResult({ role: role.output, permissions, org, membership, organization })
}
