import type { MutationCtx } from "#convex/_generated/server.js"
import type { Doc } from "#convex/_generated/dataModel.js"

export async function organizerDashboardOrderAuditWrite(
  ctx: MutationCtx,
  input: Omit<Doc<"organizerDashboardOrderAudit">, "_id" | "_creationTime">,
) {
  await ctx.db.insert("organizerDashboardOrderAudit", input)
  // No PII, credentials, capability codes or historical snapshots in logs/audit.
  console.info("organizerDashboardOrderAudit", { action: input.action, orgId: input.orgId, orderId: input.orderId })
}
