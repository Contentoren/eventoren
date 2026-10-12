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
        updatedAt: now,
      })
    if (change.codeDisposition === "charge_foreign_reservation")
      await ctx.db.patch("ticketActivationCodes", change.code._id, { consumedAt: now, updatedAt: now })
    if (change.codeDisposition === "release")
      await ctx.db.patch("ticketActivationCodes", change.code._id, {
        status: change.code.consumedAt === undefined ? "available" : "consumed",
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
