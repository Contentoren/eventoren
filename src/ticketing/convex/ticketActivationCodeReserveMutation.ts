import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { TicketActivationCodeReserveResult } from "#src/ticketing/TicketActivationCodeReserveResult.ts"
import { ticketActivationCodeReserveInputSchema } from "#src/ticketing/ticketActivationCodeReserveInputSchema.ts"
import { ticketAccessDigestCreate } from "./ticketAccessDigestCreate.js"
import { ticketActivationCodeHoldCredentialCreate } from "./ticketActivationCodeHoldCredentialCreate.js"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.js"
import { ticketActivationCodeReserveValidator } from "./ticketActivationCodeReserveValidator.ts"

/** Server-owned hold window: 15 minutes from the first reservation. */
const holdDurationMs = 15 * 60 * 1000
const codePattern = /^[A-Z0-9]{8}$/

/**
 * Ownership proof for a code that is already attached to an order.
 *
 * Only the order that really owns this code may be revalidated by its holder:
 * the order must exist, must still be pending and must hold exactly this code
 * with one matching active reservation history. Everything else is corrupt
 * data and fails closed - this read-only check never releases or repairs a row.
 */
async function ticketActivationCodeAttachedOrderOwns(
  ctx: MutationCtx,
  stored: Doc<"ticketActivationCodes">,
  orderId: Id<"ticketOrders">,
  active: readonly Doc<"ticketActivationCodeReservations">[],
): Promise<boolean> {
  const order = await ctx.db.get("ticketOrders", orderId)
  if (!order) return false
  // A settled order (paid, failed, expired, released) is terminal: its code
  // never validates again.
  const orderPending =
    (order.status === "reserved" || order.status === "checkout_created") && order.paymentStatus === "pending"
  if (!orderPending) return false
  if (order.eventKey !== stored.eventKey) return false
  // The order lines are a complete, order-scoped set: bounded by the checkout
  // transaction size, never an unbounded scan.
  const lines = await ctx.db
    .query("ticketOrderLines")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .collect()
  const owned = lines.filter((line) => line.activationCodeId === stored._id && line.tierId === stored.tierId)
  if (owned.length !== 1) return false
  if (active.length !== 1) return false
  const history = active[0]
  if (!history) return false
  if (history.orderId !== order._id) return false
  if (history.tierId !== stored.tierId || history.eventId !== stored.eventId) return false
  if (history.eventKey !== stored.eventKey || history.tierKey !== stored.tierKey) return false
  return true
}

export const ticketActivationCodeReserveMutation = mutation({
  args: { ...ticketActivationCodeReserveValidator },
  handler: async (ctx, args): PromiseResult<TicketActivationCodeReserveResult> => {
    // Minimal public answer on purpose: every failure mode maps to the same
    // generic invalid result, so no code inventory and no hold ownership leaks.
    const invalid = () => createResult({ valid: false as const })
    const parsed = a.safeParse(ticketActivationCodeReserveInputSchema, args)
    if (!parsed.success) return invalid()
    const input = parsed.output
    const normalized = ticketActivationCodeNormalize(input.code)
    if (!codePattern.test(normalized)) return invalid()
    const event = await ctx.db
      .query("catalogEvents")
      .withIndex("eventKey", (q) => q.eq("eventKey", input.eventKey))
      .unique()
    if (!event || event.deletedAt || event.status !== "published") return invalid()
    const tier = await ctx.db
      .query("catalogTicketTiers")
      .withIndex("eventIdAndTierKey", (q) => q.eq("eventId", event._id).eq("tierKey", input.tierKey))
      .unique()
    if (!tier || tier.archivedAt) return invalid()
    const matches = await ctx.db
      .query("ticketActivationCodes")
      .withIndex("code", (q) => q.eq("code", normalized))
      .take(2)
    if (matches.length !== 1) return invalid()
    const stored = matches[0]
    if (!stored || stored.eventId !== event._id || stored.tierId !== tier._id) return invalid()

    const now = Date.now()

    // Terminal guards run before every holder replay: a consumed, paid or
    // cancelled code never validates again, not even for the browser that
    // still holds a stale credential for it.
    if (stored.status === "consumed" || stored.consumedAt !== undefined) return invalid()
    // A charged order history is the durable proof of a paid code, even when
    // the code row itself still looks uncharged.
    const charged = await ctx.db
      .query("ticketActivationCodeReservations")
      .withIndex("codeIdAndStatusAndCreatedAt", (q) => q.eq("codeId", stored._id).eq("status", "consumed"))
      .first()
    if (charged) return invalid()
    // At most one order may own the code at a time.
    const active = await ctx.db
      .query("ticketActivationCodeReservations")
      .withIndex("codeIdAndStatusAndCreatedAt", (q) => q.eq("codeId", stored._id).eq("status", "reserved"))
      .take(2)

    const holdExpiresAt = stored.browserHoldExpiresAt
    const holdActive = stored.browserHoldDigest !== undefined && holdExpiresAt !== undefined && holdExpiresAt > now

    // The holder proves ownership with its credential: the deadline stays
    // exactly as it is, a repeated entry never extends it.
    if (holdActive) {
      if (input.holdToken === undefined) return invalid()
      const digest = await ticketAccessDigestCreate(input.holdToken)
      if (!digest.success) return invalid()
      if (digest.data !== stored.browserHoldDigest) return invalid()
      const orderId = stored.orderId
      if (orderId !== undefined) {
        // The code belongs to an order: only that order, still pending and
        // still owning this code, may be revalidated by its holder.
        if (!(await ticketActivationCodeAttachedOrderOwns(ctx, stored, orderId, active))) return invalid()
      } else if (active.length > 0) {
        // An unattached code with an active order history is corrupt: fail
        // closed instead of handing out a hold for a code an order owns.
        return invalid()
      }
      return createResult({ valid: true as const, holdToken: input.holdToken, expiresAt: holdExpiresAt })
    }

    // An order owns the code or already charged it: never reservable.
    if (stored.orderId !== undefined) return invalid()
    // A browser hold is the only reservation without an order.
    const browserHold = stored.status === "reserved" && stored.browserHoldDigest !== undefined
    if (stored.status !== "available" && !browserHold) return invalid()
    // Conflicting order history (active or charged) blocks a fresh reservation.
    if (active.length > 0) return invalid()

    // An expired window of the same browser keeps its credential; every other
    // caller gets a fresh one.
    const credential = await ticketActivationCodeHoldCredentialCreate(stored.browserHoldDigest, input.holdToken)
    if (!credential.success) return invalid()
    const expiresAt = now + holdDurationMs
    await ctx.db.patch("ticketActivationCodes", stored._id, {
      status: "reserved",
      browserHoldDigest: credential.data.holdDigest,
      browserHoldExpiresAt: expiresAt,
      updatedAt: new Date(now).toISOString(),
    })
    // Only this exact hold may be released by the scheduler.
    await ctx.scheduler.runAfter(holdDurationMs, internal.ticketing.ticketActivationCodeHoldExpireMutation, {
      codeId: stored._id,
      holdDigest: credential.data.holdDigest,
      expiresAt,
    })
    return createResult({ valid: true as const, holdToken: credential.data.holdToken, expiresAt })
  },
})
