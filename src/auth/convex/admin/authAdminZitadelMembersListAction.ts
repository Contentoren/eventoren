import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { authAdminZitadelAccessReadFn } from "#src/auth/convex/admin/authAdminZitadelAccessRead.ts"
import { authZitadelMemberProviderCreate } from "#src/auth/convex/admin/authZitadelMemberProviderCreate.ts"
import { authZitadelRolesFromUserGrants } from "#src/auth/convex/admin/authZitadelRolesFromUserGrants.ts"
import { authZitadelUserGrantsRead } from "#src/auth/convex/admin/authZitadelUserGrantsRead.ts"
import { authZitadelUsersSearch } from "#src/auth/convex/admin/authZitadelUsersSearch.ts"
import { zitadelRole } from "#src/auth/model_field/zitadelRole.ts"

export const authAdminZitadelMembersListAction = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
    token: v.string(),
  },
  handler: async (ctx, args): PromiseResult<AdminZitadelMembersList> => {
    const accessResult = await authAdminZitadelAccessReadFn(ctx, args.token)
    if (!accessResult.success) return accessResult
    const offset = integerAtLeast(args.offset, 0, 0)
    const limit = integerAtLeast(args.limit, 1, 50, 100)
    const usersResult = await authZitadelUsersSearch(args.search ?? "", offset, limit)
    if (!usersResult.success) return usersResult
    const grantsResult = await authZitadelUserGrantsRead()
    if (!grantsResult.success) return grantsResult

    const grantsByUserId = new Map<string, (typeof grantsResult.data)[number][]>()
    for (const grant of grantsResult.data) {
      const grants = grantsByUserId.get(grant.userId) ?? []
      grants.push(grant)
      grantsByUserId.set(grant.userId, grants)
    }

    const members: AdminZitadelMember[] = []
    for (const user of usersResult.data.users) {
      const grants = grantsByUserId.get(user.id) ?? []
      const roles = authZitadelRolesFromUserGrants(grants)
      const synchronizedResult = await ctx.runMutation(internal.auth.authZitadelMemberSynchronizeInternalMutation, {
        createIfMissing: false,
        provider: authZitadelMemberProviderCreate(user, roles),
      })
      if (!synchronizedResult.success) return synchronizedResult
      const localUser = synchronizedResult.data
      members.push({
        displayName: user.displayName,
        email: user.email,
        eventorenRole: localUser?.role,
        eventorenUserId: localUser?._id,
        organizerGranted: grants.some(
          (grant) => grant.state === "active" && grant.roleKeys.includes(zitadelRole.organizer),
        ),
        organizerInvitedAt: localUser?.organizerInvitedAt,
        preferredLoginName: user.preferredLoginName,
        userName: user.userName,
        zitadelRoles: roles,
        zitadelUserId: user.id,
      })
    }

    return createResult({ members, total: usersResult.data.total })
  },
})

type AdminZitadelMember = {
  displayName: string
  email?: string
  eventorenRole?: "user" | "customer" | "organizer" | "admin" | "dev"
  eventorenUserId?: string
  organizerGranted: boolean
  organizerInvitedAt?: string
  preferredLoginName?: string
  userName: string
  zitadelRoles: readonly ("customer" | "organizer" | "admin")[]
  zitadelUserId: string
}

type AdminZitadelMembersList = {
  members: readonly AdminZitadelMember[]
  total: number
}

function integerAtLeast(value: number | undefined, minimum: number, fallback: number, maximum?: number): number {
  const candidate = value ?? fallback
  if (!Number.isInteger(candidate) || candidate < minimum) return fallback
  if (maximum !== undefined) return Math.min(candidate, maximum)
  return candidate
}
