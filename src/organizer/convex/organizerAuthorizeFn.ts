import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { userRoleCanAccessOrganizer } from "#src/auth/model_field/userRole.ts"
import { userRoleIsAdmin } from "#src/auth/model_field/userRoleIsAdmin.ts"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import type { OrganizerDashboardPermission } from "#src/organizer/dashboard/model/organizerDashboardPermissionSchema.ts"

export async function organizerAuthorizeFn(
  ctx: { db: DatabaseReader },
  userId: IdUser,
  eventStartsAt?: string,
  orgId?: Id<"orgs">,
  permission?: OrganizerDashboardPermission,
): PromiseResult<DocUser> {
  const op = "organizerAuthorizeFn"
  const user = await ctx.db.get("users", userId)
  if (!user || user.deletedAt) return createResultError(op, "Benutzer nicht gefunden.")
  if (!userRoleCanAccessOrganizer(user.role)) return createResultError(op, "Eine Veranstalterrolle ist erforderlich.")
  if (userRoleIsAdmin(user.role)) return createResult(user)
  if (orgId !== undefined) {
    const membership = await organizerDashboardAuthorize(ctx, userId, orgId, permission)
    if (!membership.success) return membership
    return createResult(user)
  }
  if (eventStartsAt === undefined) return createResult(user)
  if (!user.organizerInvitedAt) return createResultError(op, "Die Einladungszeit des Veranstalters fehlt.")

  const eventTimestamp = Date.parse(eventStartsAt)
  const invitationTimestamp = Date.parse(user.organizerInvitedAt)
  if (!Number.isFinite(eventTimestamp) || !Number.isFinite(invitationTimestamp)) {
    return createResultError(op, "Ungültiger Autorisierungszeitpunkt.")
  }
  if (eventTimestamp < invitationTimestamp)
    return createResultError(op, "Die Veranstaltung beginnt vor der Veranstaltereinladung.")
  return createResult(user)
}
