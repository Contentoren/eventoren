import type { MutationCtx } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { OrganizerDashboardAdminAuditAction } from "./organizerDashboardAdminAuditActionSchema.ts"
import type { OrganizerDashboardAdminAuditArea } from "./organizerDashboardAdminAuditAreaSchema.ts"

export async function organizerDashboardAuditWrite(
  ctx: MutationCtx,
  entry: {
    orgId: Id<"orgs">
    actorUserId: Id<"users">
    area: OrganizerDashboardAdminAuditArea
    action: OrganizerDashboardAdminAuditAction
    at: string
    note?: string
  },
): Promise<void> {
  await ctx.db.insert("organizerDashboardAudit", {
    orgId: entry.orgId,
    actorUserId: entry.actorUserId,
    area: entry.area,
    action: entry.action,
    ...(entry.note !== undefined ? { note: entry.note } : {}),
    at: entry.at,
  })
}
