import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketMaxPerOrder } from "../ticketMaxPerOrder.js"

export async function ticketReservationsRelease(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
  now: string,
): PromiseResult<void> {
  const op = "ticketReservationsRelease"
  // One reservation per checkout line, with positive quantities totaling at most ticketMaxPerOrder.
  const reservations = await ctx.db
    .query("ticketReservations")
    .withIndex("orderId", (q) => q.eq("orderId", orderId))
    .take(ticketMaxPerOrder + 1)
  if (
    reservations.length > ticketMaxPerOrder ||
    reservations.some((reservation) => !Number.isSafeInteger(reservation.quantity) || reservation.quantity < 1) ||
    reservations.reduce((total, reservation) => total + reservation.quantity, 0) > ticketMaxPerOrder
  )
    return createResultError(op, "Reservations exceed the order maximum or have invalid quantities")
  const quantitiesByTier = new Map<Id<"catalogTicketTiers">, number>()
  for (const reservation of reservations) {
    if (reservation.status !== "active") continue
    quantitiesByTier.set(reservation.tierId, (quantitiesByTier.get(reservation.tierId) ?? 0) + reservation.quantity)
  }
  // Returning a Result error does not roll back Convex writes: validate every tier before changing any.
  const tiers = new Map<Id<"catalogTicketTiers">, Doc<"catalogTicketTiers">>()
  for (const [tierId, quantity] of quantitiesByTier) {
    const tier = await ctx.db.get("catalogTicketTiers", tierId)
    if (!tier || !Number.isSafeInteger(tier.reserved) || tier.reserved < quantity)
      return createResultError(op, "Reserved inventory is corrupt")
    tiers.set(tierId, tier)
  }
  for (const [tierId, tier] of tiers)
    await ctx.db.patch("catalogTicketTiers", tierId, { reserved: tier.reserved - (quantitiesByTier.get(tierId) ?? 0) })
  for (const reservation of reservations) {
    if (reservation.status !== "active") continue
    await ctx.db.patch("ticketReservations", reservation._id, {
      status: "released",
      releasedAt: now,
    })
  }
  return createResult(undefined)
}
