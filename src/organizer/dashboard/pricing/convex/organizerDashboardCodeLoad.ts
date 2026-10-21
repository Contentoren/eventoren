import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type Result } from "#result"

/** Loads one org-owned code row or fails closed without leaking other orgs. */
export async function organizerDashboardCodeLoad(
  ctx: { db: MutationCtx["db"] },
  orgId: Id<"orgs">,
  codeId: string,
  op: string,
): Promise<Result<Doc<"organizerDashboardCodes">>> {
  let existing = null
  try {
    existing = await ctx.db.get("organizerDashboardCodes", codeId as Id<"organizerDashboardCodes">)
  } catch {
    return createResultError(op, "Code nicht verfügbar")
  }
  if (!existing || existing.orgId !== orgId) return createResultError(op, "Code nicht verfügbar")
  return createResult(existing)
}
