import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"

export async function ticketReservationsRelease(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  now: string,
): PromiseResult<void> {
  const reservations = await ctx.db
    .query("ticketReservations")
    .withIndex("orderId", (q) => q.eq("orderId", orderId))
    .collect()
  for (const reservation of reservations) {
    if (reservation.status !== "active") continue
    const tier = await ctx.db.get(reservation.tierId)
    if (!tier || tier.reserved < reservation.quantity)
      return createResultError("ticketReservationsRelease", "Reserved inventory is corrupt")
    await ctx.db.patch("catalogTicketTiers", tier._id, { reserved: tier.reserved - reservation.quantity })
    await ctx.db.patch("ticketReservations", reservation._id, {
      status: "released",
      releasedAt: now,
    })
  }
  return createResult(undefined)
}
