import { createResult, createResultError, type Result } from "#result"
import type { OrganizerDashboardRole } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardPermissionsGet } from "#src/organizer/dashboard/model/organizerDashboardPermissionsGet.ts"

/**
 * Guard for every team role change.
 *
 * - Granting, changing or removing the owner role is reserved for the current owner.
 * - Nobody may escalate their own role (an admin cannot promote itself).
 * - The last owner is protected separately by the indexed owner probe.
 */
export function organizerDashboardTeamRoleGuard(inputs: {
  readonly actorRole: OrganizerDashboardRole
  readonly actorMemberId: string
  readonly targetMemberId: string
  readonly targetRole: OrganizerDashboardRole | null
  readonly nextRole: OrganizerDashboardRole | null
}): Result<null> {
  const op = "organizerDashboardTeamRoleGuard"
  const touchesOwner = inputs.targetRole === "inhaber" || inputs.nextRole === "inhaber"
  if (touchesOwner && inputs.actorRole !== "inhaber") {
    return createResultError(op, "Only the current owner can grant, change or remove the owner role")
  }
  if (inputs.actorMemberId === inputs.targetMemberId && inputs.nextRole !== null) {
    const currentPermissions =
      inputs.targetRole === null ? new Set() : organizerDashboardPermissionsGet(inputs.targetRole)
    if (
      [...organizerDashboardPermissionsGet(inputs.nextRole)].some((permission) => !currentPermissions.has(permission))
    ) {
      return createResultError(op, "You cannot escalate your own role")
    }
  }
  return createResult(null)
}
