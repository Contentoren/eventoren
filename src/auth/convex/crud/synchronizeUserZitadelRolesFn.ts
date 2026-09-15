import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { userRole } from "#src/auth/model_field/userRole.ts"
import { userRoleSource } from "#src/auth/model_field/userRoleSource.ts"
import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import { zitadelRolesToUserRole } from "#src/auth/model_field/zitadelRolesToUserRole.ts"

export async function synchronizeUserZitadelRolesFn(
  ctx: MutationCtx,
  userId: IdUser,
  providerId: string,
  roles: readonly ZitadelRole[] | undefined,
  organizerInvitedAt?: string,
): PromiseResult<DocUser> {
  const op = "synchronizeUserZitadelRolesFn"
  const user = await ctx.db.get("users", userId)
  if (!user) return createResultError(op, "User not found by userId", userId)

  const normalizedRoles = roles === undefined ? undefined : [...new Set(roles)]
  const isDevOverride = user.role === userRole.dev
  const isLegacyAdminOverride = user.role === userRole.admin && user.roleSource !== userRoleSource.zitadel
  const isProviderManaged = !isDevOverride && !isLegacyAdminOverride
  const hasOrganizerRole = normalizedRoles?.includes(zitadelRole.organizer) === true
  const hadOrganizerRole = user.zitadelRoles?.includes(zitadelRole.organizer) === true
  const nextOrganizerInvitedAt = hasOrganizerRole
    ? hadOrganizerRole && user.organizerInvitedAt
      ? user.organizerInvitedAt
      : (organizerInvitedAt ?? new Date().toISOString())
    : undefined

  await ctx.db.patch(userId, {
    zitadelUserId: providerId,
    ...(isProviderManaged ? { roleSource: userRoleSource.zitadel } : { roleSource: undefined }),
    ...(normalizedRoles
      ? {
          role: isProviderManaged ? zitadelRolesToUserRole(normalizedRoles) : user.role,
          zitadelRoles: normalizedRoles,
          zitadelRolesSynchronizedAt: new Date().toISOString(),
          organizerInvitedAt: nextOrganizerInvitedAt,
        }
      : {}),
    updatedAt: new Date().toISOString(),
  })
  const synchronizedUser = await ctx.db.get("users", userId)
  if (!synchronizedUser) return createResultError(op, "User disappeared during role synchronization", userId)
  return createResult(synchronizedUser)
}
