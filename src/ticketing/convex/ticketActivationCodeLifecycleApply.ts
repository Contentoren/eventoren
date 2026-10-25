import type { MutationCtx } from "#convex/_generated/server.js"
import type { ticketActivationCodeLifecyclePlan } from "./ticketActivationCodeLifecyclePlan.js"

/** No fallible Result operations here: every decision was validated by the read-only plan. */
export async function ticketActivationCodeLifecycleApply(
  ctx: MutationCtx,
  plan: Extract<Awaited<ReturnType<typeof ticketActivationCodeLifecyclePlan>>, { success: true }>["data"],
  now: string,
) {
  for (const change of plan.changes) {
    if (change.codeDisposition === "consume")
      await ctx.db.patch("ticketActivationCodes", change.code._id, {
        status: "consumed",
        orderId: change.history.orderId,
        consumedAt: change.code.consumedAt ?? now,
        // The browser hold ends with the charge: a stale credential must never
        // keep the charged code reserved for a later browser.
        browserHoldDigest: undefined,
        browserHoldExpiresAt: undefined,
        updatedAt: now,
      })
    if (change.codeDisposition === "charge_foreign_reservation")
      // A foreign holder keeps its hold: only the charge scar is recorded.
      await ctx.db.patch("ticketActivationCodes", change.code._id, { consumedAt: now, updatedAt: now })
    if (change.codeDisposition === "release")
      await ctx.db.patch("ticketActivationCodes", change.code._id, {
        status: "available",
        orderId: undefined,
        consumedAt: undefined,
        reservedAt: undefined,
        // The code is free again, so the browser hold of this purchase ends.
        browserHoldDigest: undefined,
        browserHoldExpiresAt: undefined,
        updatedAt: now,
      })
    if (change.codeDisposition === "release_charged")
      // Another order paid for this code: it stays blocked for that owner.
      await ctx.db.patch("ticketActivationCodes", change.code._id, {
        status: "consumed",
        orderId: change.chargedOwnerId,
        reservedAt: undefined,
        updatedAt: now,
      })
    if (change.history.status !== change.historyStatus)
      await ctx.db.patch("ticketActivationCodeReservations", change.history._id, {
        status: change.historyStatus,
        updatedAt: now,
      })
  }
}
