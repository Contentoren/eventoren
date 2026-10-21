import * as v from "valibot"
import { v as convexV } from "convex/values"
import { query } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { Id } from "#convex/_generated/dataModel.js"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import type { OrganizerDashboardRole } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardPermissionsGet } from "#src/organizer/dashboard/model/organizerDashboardPermissionsGet.ts"
import { organizerDashboardAuthorize } from "./organizerDashboardAuthorize.js"

const maxOrganizations = 100
const membershipTakeLimit = 101

type OrganizerDashboardContextOrganization = {
  id: Id<"orgs">
  name: string
  slug: string
  role: OrganizerDashboardRole
  status: string
}

type OrganizerDashboardActiveOrganization = OrganizerDashboardContextOrganization & {
  permissions: string[]
  profile: { name: string; slug: string }
}

type OrganizerDashboardContext = {
  organizations: OrganizerDashboardContextOrganization[]
  activeOrganization: OrganizerDashboardActiveOrganization | null
}

function organizerDashboardContextStatusMap(status: "pruefung" | "aktiv" | "gesperrt"): string {
  if (status === "pruefung") return "ausstehend"
  return status
}

function organizerDashboardActiveOrganizationCreate(
  org: { _id: Id<"orgs">; name?: string; orgHandle: string },
  organization: { status: "pruefung" | "aktiv" | "gesperrt"; profile: { name: string; slug: string } },
  role: OrganizerDashboardRole,
): OrganizerDashboardActiveOrganization {
  return {
    id: org._id,
    name: org.name ?? organization.profile.name,
    slug: org.orgHandle,
    role,
    status: organizerDashboardContextStatusMap(organization.status),
    permissions: Array.from(organizerDashboardPermissionsGet(role)),
    profile: { name: organization.profile.name, slug: organization.profile.slug },
  }
}

export const organizerDashboardContextQuery = query({
  args: { token: convexV.string(), orgId: convexV.optional(convexV.id("orgs")) },
  handler: (ctx, args): PromiseResult<OrganizerDashboardContext> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orgId }) => {
      const op = "organizerDashboardContextQuery"
      const memberships = await queryCtx.db
        .query("orgMembers")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .take(membershipTakeLimit)
      if (memberships.length > maxOrganizations) {
        return createResultError(op, "Pagination required: too many organizations")
      }
      const organizations: OrganizerDashboardContextOrganization[] = []
      for (const membership of memberships) {
        if (!membership.organizerRole) continue
        const role = v.safeParse(organizerDashboardRoleSchema, membership.organizerRole)
        if (!role.success) continue
        const org = await queryCtx.db.get("orgs", membership.orgId)
        if (!org) continue
        const organization = await queryCtx.db
          .query("organizerDashboardOrganizations")
          .withIndex("orgId", (q) => q.eq("orgId", membership.orgId))
          .unique()
        if (!organization) continue
        organizations.push({
          id: membership.orgId,
          name: org.name ?? organization.profile.name,
          slug: org.orgHandle,
          role: role.output,
          status: organizerDashboardContextStatusMap(organization.status),
        })
      }
      let activeOrganization: OrganizerDashboardActiveOrganization | null = null
      if (orgId !== undefined) {
        const authorization = await organizerDashboardAuthorize(queryCtx, userId, orgId)
        if (!authorization.success) return authorization
        const { role, org, organization } = authorization.data
        activeOrganization = organizerDashboardActiveOrganizationCreate(org, organization, role)
      } else {
        const fallback = organizations.find((candidate) => candidate.status !== "gesperrt")
        if (fallback) {
          const authorization = await organizerDashboardAuthorize(queryCtx, userId, fallback.id)
          if (authorization.success) {
            const { role, org, organization } = authorization.data
            activeOrganization = organizerDashboardActiveOrganizationCreate(org, organization, role)
          }
        }
      }
      return createResult({ organizations, activeOrganization })
    }),
})
