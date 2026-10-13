import type { Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketAccessDigestCreate } from "./ticketAccessDigestCreate.js"
import { ticketFulfillmentWorkEligible } from "./ticketFulfillmentWorkEligible.js"

export async function ticketOrderAccessCapabilityEnsure(
  ctx: MutationCtx,
  orderId: Id<"ticketOrders">,
): PromiseResult<{ accessToken: string; accessDigest: string }> {
  const op = "ticketOrderAccessCapabilityEnsure"
  const order = await ctx.db.get("ticketOrders", orderId)
  if (!order) return createResultError(op, "The order was not found")
  if (order.cancellation !== undefined) return createResultError(op, "The order was cancelled")
  if (order.emailAccessRevokedAt !== undefined) return createResultError(op, "The ticket access capability was revoked")
  const paid = order.status === "paid" && order.paymentStatus === "paid"
  const issued =
    typeof order.ticketsIssuedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T/u.test(order.ticketsIssuedAt) &&
    Number.isFinite(Date.parse(order.ticketsIssuedAt))
  if (!paid && !(issued && ticketFulfillmentWorkEligible(order, "tickets_only")))
    return createResultError(op, "Ticket access requires paid or valid early-issued SEPA tickets")

  const existing = await ctx.db
    .query("ticketOrderDeliveries")
    .withIndex("orderId", (q) => q.eq("orderId", orderId))
    .first()
  if (existing) {
    const digestResult = await ticketAccessDigestCreate(existing.accessTokenSnapshot)
    if (!digestResult.success) return digestResult
    if (order.emailAccessDigest === digestResult.data)
      return createResult({ accessToken: existing.accessTokenSnapshot, accessDigest: digestResult.data })
    await ctx.db.patch("ticketOrders", orderId, {
      emailAccessDigest: digestResult.data,
      updatedAt: new Date().toISOString(),
    })
    return createResult({ accessToken: existing.accessTokenSnapshot, accessDigest: digestResult.data })
  }

  const accessToken = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`
  const digestResult = await ticketAccessDigestCreate(accessToken)
  if (!digestResult.success) return digestResult
  const now = new Date().toISOString()
  await ctx.db.insert("ticketOrderDeliveries", {
    orderId,
    accessTokenSnapshot: accessToken,
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.patch("ticketOrders", orderId, { emailAccessDigest: digestResult.data, updatedAt: now })
  return createResult({ accessToken, accessDigest: digestResult.data })
}
