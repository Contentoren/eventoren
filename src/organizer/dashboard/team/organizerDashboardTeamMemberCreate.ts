import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Doc } from "#convex/_generated/dataModel.js"
import type { OrganizerDashboardTeamMember } from "#src/organizer/dashboard/team/organizerDashboardTeamMemberSchema.ts"

/**
 * Team row of one organization member.
 * The canonical membership role (member/guest) and `invitedBy` are reported
 * unchanged; team management only ever changes `organizerRole`.
 */
export async function organizerDashboardTeamMemberCreate(
  ctx: { db: DatabaseReader },
  member: Doc<"orgMembers">,
): Promise<OrganizerDashboardTeamMember> {
  const user = await ctx.db.get("users", member.userId)
  return {
    id: member._id,
    userId: member.userId,
    name: user?.name ?? "Unbekanntes Konto",
    email: user?.email ?? null,
    role: member.role,
    organizerRole: member.organizerRole ?? null,
    invitedBy: member.invitedBy,
    createdAt: member.createdAt,
  }
}
