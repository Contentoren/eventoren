import type { DatabaseReader } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { DocUser, IdUser } from "#src/auth/convex/IdUser.ts"
import { userRoleCanAccessOrganizer, userRoleIsDevOrAdmin } from "#src/auth/model_field/userRole.ts"

export async function organizerAuthorizeFn(
  ctx: { db: DatabaseReader },
  userId: IdUser,
  eventStartsAt?: string,
): PromiseResult<DocUser> {
  const op = "organizerAuthorizeFn"
  const user = await ctx.db.get("users", userId)
  if (!user || user.deletedAt) return createResultError(op, "User not found")
  if (!userRoleCanAccessOrganizer(user.role)) return createResultError(op, "Organizer role required")
  if (userRoleIsDevOrAdmin(user.role)) return createResult(user)
  if (eventStartsAt === undefined) return createResult(user)
  if (!user.organizerInvitedAt) return createResultError(op, "Organizer invitation time is missing")

  const eventTimestamp = Date.parse(eventStartsAt)
  const invitationTimestamp = Date.parse(user.organizerInvitedAt)
  if (!Number.isFinite(eventTimestamp) || !Number.isFinite(invitationTimestamp)) {
    return createResultError(op, "Invalid organizer authorization timestamp")
  }
  if (eventTimestamp < invitationTimestamp) return createResultError(op, "Event starts before organizer invitation")
  return createResult(user)
}
