import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { action } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authAdminZitadelAccessReadFn } from "#src/auth/convex/admin/authAdminZitadelAccessRead.ts"
import { authZitadelMemberProviderCreate } from "#src/auth/convex/admin/authZitadelMemberProviderCreate.ts"
import { authZitadelRolesFromUserGrants } from "#src/auth/convex/admin/authZitadelRolesFromUserGrants.ts"
import { authZitadelUserGrantsRead } from "#src/auth/convex/admin/authZitadelUserGrantsRead.ts"
import { authZitadelUserRead } from "#src/auth/convex/admin/authZitadelUserRead.ts"
import { zitadelRole } from "#src/auth/model_field/zitadelRole.ts"
import { authZitadelManagementConfigRead } from "#src/auth/server/authZitadelManagementConfigRead.ts"
import { authZitadelManagementRequest } from "#src/auth/server/authZitadelManagementRequest.ts"

export const authAdminZitadelOrganizerGrantAction = action({
  args: {
    operation: v.union(v.literal("grant"), v.literal("revoke")),
    token: v.string(),
    zitadelUserId: v.string(),
  },
  handler: async (ctx, args): PromiseResult<AdminZitadelOrganizerGrantResult> => {
    const accessResult = await authAdminZitadelAccessReadFn(ctx, args.token)
    if (!accessResult.success) return accessResult
    const configResult = authZitadelManagementConfigRead()
    if (!configResult.success) return configResult
    const userResult = await authZitadelUserRead(args.zitadelUserId)
    if (!userResult.success) return userResult
    const beforeResult = await authZitadelUserGrantsRead(args.zitadelUserId)
    if (!beforeResult.success) return beforeResult

    const invitationAt = new Date().toISOString()
    const mutationResult =
      args.operation === "grant"
        ? await organizerGrantApply(beforeResult.data, args.zitadelUserId, configResult.data.projectId)
        : await organizerGrantRevoke(beforeResult.data, args.zitadelUserId, configResult.data.projectId)
    if (!mutationResult.success) return mutationResult

    const afterResult = await authZitadelUserGrantsRead(args.zitadelUserId)
    if (!afterResult.success) return afterResult
    const organizerIsGranted = afterResult.data.some(
      (grant) =>
        grant.state === "active" &&
        grant.roleKeys.includes(zitadelRole.organizer) &&
        grant.projectId === configResult.data.projectId,
    )
    if (args.operation === "grant" && !organizerIsGranted) {
      return createResultError("authAdminZitadelOrganizerGrantAction", "ZITADEL organizer grant could not be verified")
    }
    if (
      args.operation === "revoke" &&
      afterResult.data.some(
        (grant) =>
          grant.state === "active" &&
          grant.projectId === configResult.data.projectId &&
          grant.roleKeys.includes(zitadelRole.organizer),
      )
    ) {
      return createResultError(
        "authAdminZitadelOrganizerGrantAction",
        "ZITADEL organizer grant revocation could not be verified",
      )
    }

    const roles = authZitadelRolesFromUserGrants(afterResult.data)
    const synchronizedResult = await ctx.runMutation(internal.auth.authZitadelMemberSynchronizeInternalMutation, {
      createIfMissing: args.operation === "grant",
      organizerInvitedAt: args.operation === "grant" ? invitationAt : undefined,
      provider: authZitadelMemberProviderCreate(userResult.data, roles),
    })
    if (!synchronizedResult.success) return synchronizedResult
    if (args.operation === "grant" && !synchronizedResult.data) {
      return createResultError("authAdminZitadelOrganizerGrantAction", "Eventoren user could not be synchronized")
    }

    return createResult({
      eventorenRole: synchronizedResult.data?.role,
      eventorenUserId: synchronizedResult.data?._id,
      organizerGranted: organizerIsGranted,
      organizerInvitedAt: synchronizedResult.data?.organizerInvitedAt,
      operation: args.operation,
      zitadelRoles: roles,
      zitadelUserId: userResult.data.id,
    })
  },
})

type AdminZitadelOrganizerGrantResult = {
  eventorenRole?: "user" | "customer" | "organizer" | "admin" | "dev"
  eventorenUserId?: string
  organizerGranted: boolean
  organizerInvitedAt?: string
  operation: "grant" | "revoke"
  zitadelRoles: readonly ("customer" | "organizer" | "admin")[]
  zitadelUserId: string
}

type ZitadelUserGrant = {
  id: string
  projectId: string
  roleKeys: readonly string[]
  state: "active" | "inactive"
  userId: string
}

async function organizerGrantApply(
  grants: readonly ZitadelUserGrant[],
  userId: string,
  projectId: string,
): PromiseResult<undefined> {
  const organizerRoleKey = zitadelRole.organizer
  const activeOrganizer = grants.find(
    (grant) => grant.projectId === projectId && grant.state === "active" && grant.roleKeys.includes(organizerRoleKey),
  )
  if (activeOrganizer) return createResult(undefined)

  const activeGrant = grants.find((grant) => grant.projectId === projectId && grant.state === "active")
  if (activeGrant) {
    return organizerGrantUpdate(activeGrant, [...new Set([...activeGrant.roleKeys, organizerRoleKey])])
  }

  const inactiveGrant = grants.find((grant) => grant.projectId === projectId && grant.state === "inactive")
  if (inactiveGrant) {
    const reactivated = await authZitadelManagementRequest({
      method: "POST",
      path: `/management/v1/users/${encodeURIComponent(userId)}/grants/${encodeURIComponent(inactiveGrant.id)}/_reactivate`,
    })
    if (!reactivated.success) return reactivated
    if (inactiveGrant.roleKeys.includes(organizerRoleKey)) return createResult(undefined)
    return organizerGrantUpdate(inactiveGrant, [...new Set([...inactiveGrant.roleKeys, organizerRoleKey])])
  }

  const added = await authZitadelManagementRequest({
    body: { projectId, roleKeys: [organizerRoleKey] },
    method: "POST",
    path: `/management/v1/users/${encodeURIComponent(userId)}/grants`,
  })
  if (!added.success) return added
  return createResult(undefined)
}

async function organizerGrantRevoke(
  grants: readonly ZitadelUserGrant[],
  userId: string,
  projectId: string,
): PromiseResult<undefined> {
  const configResult = authZitadelManagementConfigRead()
  if (!configResult.success) return configResult
  for (const grant of grants) {
    if (grant.projectId !== projectId) continue
    if (!grant.roleKeys.includes(zitadelRole.organizer)) continue
    const remainingRoleKeys = grant.roleKeys.filter((roleKey) => roleKey !== zitadelRole.organizer)
    if (remainingRoleKeys.length === 0) {
      const removed = await authZitadelManagementRequest({
        method: "DELETE",
        path: `/management/v1/users/${encodeURIComponent(userId)}/grants/${encodeURIComponent(grant.id)}`,
      })
      if (!removed.success) return removed
      continue
    }
    const updated = await organizerGrantUpdate(grant, remainingRoleKeys)
    if (!updated.success) return updated
  }
  return createResult(undefined)
}

async function organizerGrantUpdate(grant: ZitadelUserGrant, roleKeys: readonly string[]): PromiseResult<undefined> {
  const updated = await authZitadelManagementRequest({
    body: { roleKeys },
    method: "PUT",
    path: `/management/v1/users/${encodeURIComponent(grant.userId)}/grants/${encodeURIComponent(grant.id)}`,
  })
  if (!updated.success) return updated
  return createResult(undefined)
}
