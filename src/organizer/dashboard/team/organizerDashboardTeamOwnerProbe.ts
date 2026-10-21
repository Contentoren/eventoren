import type { DatabaseReader } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"

/**
 * Only a LIVE user with exactly one canonical membership is a usable owner.
 * Excludes the owner being changed. The indexed probe checks at most 100
 * candidates (+ one sentinel); it fails closed when that budget cannot prove
 * another usable owner. No unbounded roster scan or silent safety cap.
 * Transaction reads of the owner range, users and duplicate ranges also fence
 * concurrent demotions/deletions: Convex must retry against the new state.
 */
export async function organizerDashboardTeamOwnerProbe(
  ctx: { db: DatabaseReader },
  orgId: Id<"orgs">,
  excludedMemberId: Id<"orgMembers">,
): Promise<{ readonly anotherOwnerExists: boolean; readonly budgetExhausted: boolean }> {
  const budget = 100
  const owners = await ctx.db
    .query("orgMembers")
    .withIndex("orgIdAndOrganizerRole", (q) => q.eq("orgId", orgId).eq("organizerRole", "inhaber"))
    .take(budget + 1)
  for (const owner of owners.slice(0, budget)) {
    if (owner._id === excludedMemberId) continue
    const user = await ctx.db.get("users", owner.userId)
    if (!user || user.deletedAt) continue
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", owner.userId).eq("orgId", orgId))
      .take(2)
    if (memberships.length === 1) return { anotherOwnerExists: true, budgetExhausted: false }
  }
  return { anotherOwnerExists: false, budgetExhausted: owners.length > budget }
}
