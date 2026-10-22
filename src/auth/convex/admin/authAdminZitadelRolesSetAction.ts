import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authAdminZitadelAccessReadFn } from "#src/auth/convex/admin/authAdminZitadelAccessRead.ts"
import { authZitadelMemberProviderCreate } from "#src/auth/convex/admin/authZitadelMemberProviderCreate.ts"
import { authZitadelRolesFromUserGrants } from "#src/auth/convex/admin/authZitadelRolesFromUserGrants.ts"
import { authZitadelUserGrantsRead } from "#src/auth/convex/admin/authZitadelUserGrantsRead.ts"
import { authZitadelUserRead } from "#src/auth/convex/admin/authZitadelUserRead.ts"
import { type ZitadelRole, zitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import { zitadelRoleValidator } from "#src/auth/model_field/zitadelRoleValidator.ts"
import { authZitadelManagementConfigRead } from "#src/auth/server/authZitadelManagementConfigRead.ts"
import { authZitadelManagementRequest } from "#src/auth/server/authZitadelManagementRequest.ts"

/**
 * Replaces the project roles of one member.
 *
 * Writes the desired role set through to the Zitadel Management API first and
 * only then synchronizes the local user record, so the dashboard never shows
 * roles Zitadel does not have. Rejects an empty role set and refuses to remove
 * the last remaining admin of the project.
 */
export const authAdminZitadelRolesSetAction = action({
  args: {
    roles: v.array(zitadelRoleValidator),
    token: v.string(),
    zitadelUserId: v.string(),
  },
  handler: async (ctx, args): PromiseResult<AdminZitadelRolesSetResult> => {
    const op = "authAdminZitadelRolesSetAction"
    const accessResult = await authAdminZitadelAccessReadFn(ctx, args.token)
    if (!accessResult.success) return accessResult
    const desired = [...new Set(args.roles)]
    if (desired.length === 0) {
      return createResultError(op, "At least one role is required")
    }
    const configResult = authZitadelManagementConfigRead()
    if (!configResult.success) return configResult
    const userResult = await authZitadelUserRead(args.zitadelUserId)
    if (!userResult.success) return userResult
    const beforeResult = await authZitadelUserGrantsRead(args.zitadelUserId)
    if (!beforeResult.success) return beforeResult

    const hadAdmin = beforeResult.data.some(
      (grant) =>
        grant.state === "active" &&
        grant.projectId === configResult.data.projectId &&
        grant.roleKeys.includes(zitadelRole.admin),
    )
    if (hadAdmin && !desired.includes(zitadelRole.admin)) {
      const allGrantsResult = await authZitadelUserGrantsRead()
      if (!allGrantsResult.success) return allGrantsResult
      const anotherAdminExists = allGrantsResult.data.some(
        (grant) =>
          grant.userId !== args.zitadelUserId &&
          grant.state === "active" &&
          grant.projectId === configResult.data.projectId &&
          grant.roleKeys.includes(zitadelRole.admin),
      )
      if (!anotherAdminExists) {
        return createResultError(op, "The last admin role cannot be removed")
      }
    }

    const invitationAt = new Date().toISOString()
    const mutationResult = await rolesGrantApply(
      beforeResult.data,
      args.zitadelUserId,
      configResult.data.projectId,
      desired,
    )
    if (!mutationResult.success) return mutationResult

    const afterResult = await authZitadelUserGrantsRead(args.zitadelUserId)
    if (!afterResult.success) return afterResult
    const activeGrant = afterResult.data.find(
      (grant) => grant.state === "active" && grant.projectId === configResult.data.projectId,
    )
    const verified =
      activeGrant !== undefined &&
      desired.every((roleKey) => activeGrant.roleKeys.includes(roleKey)) &&
      activeGrant.roleKeys.every((roleKey) => (desired as readonly string[]).includes(roleKey))
    if (!verified) {
      return createResultError(op, "ZITADEL roles could not be verified")
    }

    const roles = authZitadelRolesFromUserGrants(afterResult.data)
    const synchronizedResult = await ctx.runMutation(internal.auth.authZitadelMemberSynchronizeInternalMutation, {
      createIfMissing: true,
      organizerInvitedAt: invitationAt,
      provider: authZitadelMemberProviderCreate(userResult.data, roles),
    })
    if (!synchronizedResult.success) return synchronizedResult
    if (!synchronizedResult.data) {
      return createResultError(op, "Eventoren user could not be synchronized")
    }

    return createResult({
      eventorenRole: synchronizedResult.data.role,
      eventorenUserId: synchronizedResult.data._id,
      organizerGranted: roles.includes(zitadelRole.organizer),
      organizerInvitedAt: synchronizedResult.data.organizerInvitedAt,
      roles,
      zitadelUserId: userResult.data.id,
    })
  },
})

type AdminZitadelRolesSetResult = {
  eventorenRole?: "user" | "customer" | "organizer" | "admin"
  eventorenUserId?: string
  organizerGranted: boolean
  organizerInvitedAt?: string
  roles: readonly ZitadelRole[]
  zitadelUserId: string
}

type ZitadelUserGrant = {
  id: string
  projectId: string
  roleKeys: readonly string[]
  state: "active" | "inactive"
  userId: string
}

async function rolesGrantApply(
  grants: readonly ZitadelUserGrant[],
  userId: string,
  projectId: string,
  roleKeys: readonly ZitadelRole[],
): PromiseResult<undefined> {
  const normalized = [...new Set(roleKeys)]
  const activeGrant = grants.find((grant) => grant.projectId === projectId && grant.state === "active")
  if (activeGrant) return rolesGrantUpdate(activeGrant.userId, activeGrant.id, normalized)

  const inactiveGrant = grants.find((grant) => grant.projectId === projectId && grant.state === "inactive")
  if (inactiveGrant) {
    const reactivated = await authZitadelManagementRequest({
      method: "POST",
      path: `/management/v1/users/${encodeURIComponent(userId)}/grants/${encodeURIComponent(inactiveGrant.id)}/_reactivate`,
    })
    if (!reactivated.success) return reactivated
    return rolesGrantUpdate(inactiveGrant.userId, inactiveGrant.id, normalized)
  }

  const added = await authZitadelManagementRequest({
    body: { projectId, roleKeys: normalized },
    method: "POST",
    path: `/management/v1/users/${encodeURIComponent(userId)}/grants`,
  })
  if (!added.success) return added
  return createResult(undefined)
}

async function rolesGrantUpdate(
  userId: string,
  grantId: string,
  roleKeys: readonly string[],
): PromiseResult<undefined> {
  const updated = await authZitadelManagementRequest({
    body: { roleKeys },
    method: "PUT",
    path: `/management/v1/users/${encodeURIComponent(userId)}/grants/${encodeURIComponent(grantId)}`,
  })
  if (!updated.success) return updated
  return createResult(undefined)
}
