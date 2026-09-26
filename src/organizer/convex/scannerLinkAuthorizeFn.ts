import type { MutationCtx, QueryCtx } from "#convex/_generated/server.js"
import type { Doc } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"

/** Call on every bearer request, including writes; do not expose the returned document publicly. */
export async function scannerLinkAuthorizeFn(
  ctx: MutationCtx | QueryCtx,
  code: string,
): PromiseResult<Doc<"scannerLinks">> {
  const op = "scannerLinkAuthorizeFn"
  if (!/^[a-f0-9]{64}$/.test(code)) return createResultError(op, "Link unavailable")
  const link = await ctx.db
    .query("scannerLinks")
    .withIndex("code", (q) => q.eq("code", code))
    .unique()
  if (!link || link.revokedAt !== undefined || link.expiresAt <= Date.now()) {
    return createResultError(op, "Link unavailable")
  }
  if (link.role === "helper") {
    if (!link.parentId) return createResultError(op, "Link unavailable")
    const parent = await ctx.db.get("scannerLinks", link.parentId)
    if (
      !parent ||
      parent.role !== "organizer" ||
      parent.parentId ||
      parent.revokedAt !== undefined ||
      parent.expiresAt <= Date.now() ||
      link.expiresAt > parent.expiresAt ||
      link.eventKeys.some((key) => !parent.eventKeys.includes(key))
    )
      return createResultError(op, "Link unavailable")
  } else if (link.parentId || !link.createdByUserId) {
    return createResultError(op, "Link unavailable")
  }
  return createResult(link)
}
