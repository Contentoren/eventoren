import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { ticketAccessDigestCreate } from "./ticketAccessDigestCreate.js"
import { ticketActivationCodeLifecycleApply } from "./ticketActivationCodeLifecycleApply.js"
import { ticketActivationCodeLifecyclePlan } from "./ticketActivationCodeLifecyclePlan.js"

/** Shared paid/processing-SEPA allocation. All Result preflights precede writes.
 * A conflict is read-only: the caller applies the existing paid conflict policy.
 */
export async function ticketOrderTicketsIssue(
  ctx: MutationCtx,
  order: Doc<"ticketOrders">,
  ticketCount: number,
  activationCodes: Extract<Awaited<ReturnType<typeof ticketActivationCodeLifecyclePlan>>, { success: true }>["data"],
  now: string,
): PromiseResult<{ ticketCount: number; inventoryConflict: boolean }> {
  const op = "ticketOrderTicketsIssue"
  // Complete order-scoped sets, bounded by checkout transaction size, not global history.
  const reservations = await ctx.db
    .query("ticketReservations")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .collect()
  const lines = await ctx.db
    .query("ticketOrderLines")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .collect()
  if (
    reservations.some((reservation) => !Number.isSafeInteger(reservation.quantity) || reservation.quantity < 1) ||
    lines.some((line) => !Number.isSafeInteger(line.quantity) || line.quantity < 1)
  )
    return createResultError(op, "Order lines or reservations exceed the order maximum")
  const expectedCount = lines.reduce((total, line) => total + line.quantity, 0)
  const issued = order.ticketsIssuedAt !== undefined
  if (
    lines.length === 0 ||
    reservations.length !== lines.length ||
    new Set(lines.map((line) => line.tierId)).size !== lines.length ||
    new Set(reservations.map((reservation) => reservation.tierId)).size !== reservations.length ||
    lines.some(
      (line) =>
        !reservations.some(
          (reservation) =>
            reservation.tierId === line.tierId &&
            reservation.quantity === line.quantity &&
            reservation.status === (issued ? "consumed" : "active"),
        ),
    )
  )
    return createResultError(op, "Paid inventory reservation is incomplete")
  if (issued) {
    if (ticketCount !== expectedCount || activationCodes.hasOwnershipConflict)
      return createResultError(op, "Issued inventory is incomplete or no longer owns its activation code")
    return createResult({ ticketCount, inventoryConflict: false })
  }
  if (ticketCount !== 0) return createResultError(op, "An unpaid order already has issued tickets")

  let hasCapacityConflict = false
  const tiers = new Map<Id<"catalogTicketTiers">, Doc<"catalogTicketTiers">>()
  for (const reservation of reservations) {
    const tier = await ctx.db.get("catalogTicketTiers", reservation.tierId)
    if (
      !tier ||
      !Number.isSafeInteger(tier.reserved) ||
      tier.reserved < reservation.quantity ||
      !Number.isSafeInteger(tier.sold) ||
      tier.sold < 0 ||
      !Number.isSafeInteger(tier.capacity) ||
      tier.capacity < 0
    )
      return createResultError(op, "Paid inventory reservation is corrupt")
    tiers.set(tier._id, tier)
    if (tier.sold + reservation.quantity > tier.capacity) hasCapacityConflict = true
  }
  if (hasCapacityConflict || activationCodes.hasOwnershipConflict)
    return createResult({ ticketCount, inventoryConflict: true })

  const delivery = await ctx.db
    .query("ticketOrderDeliveries")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .first()
  const accessToken =
    delivery?.accessTokenSnapshot ??
    `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`
  const accessDigest = await ticketAccessDigestCreate(accessToken)
  if (!accessDigest.success) return accessDigest
  const codes = new Set<string>()
  for (let index = 0; index < expectedCount; index += 1) {
    const code = await ticketIssuedCodeCreate(ctx, codes)
    if (!code.success) return code
    codes.add(code.data)
  }

  await ticketActivationCodeLifecycleApply(ctx, activationCodes, now)
  for (const reservation of reservations) {
    const tier = tiers.get(reservation.tierId)!
    await ctx.db.patch("catalogTicketTiers", tier._id, {
      reserved: tier.reserved - reservation.quantity,
      sold: tier.sold + reservation.quantity,
    })
    await ctx.db.patch("ticketReservations", reservation._id, { status: "consumed" })
  }
  const participantNamesByTier = new Map(
    reservations.map((reservation) => [reservation.tierId, reservation.participantNamesJson]),
  )
  const ticketCodes = [...codes]
  let sequence = 0
  for (const line of lines.sort((left, right) => left.tierKey.localeCompare(right.tierKey))) {
    const participantNames =
      participantNamesRead(line.participantNamesJson) ?? participantNamesRead(participantNamesByTier.get(line.tierId))
    for (let index = 0; index < line.quantity; index += 1) {
      sequence += 1
      await ctx.db.insert("ticketIssued", {
        orderId: order._id,
        sequence,
        ownerUserId: order.ownerUserId,
        guestAccessDigest: order.guestAccessDigest,
        code: ticketCodes[sequence - 1]!,
        eventKey: order.eventKey,
        eventTitle: order.eventTitle,
        eventStartsAt: order.eventStartsAt,
        eventDoorsAt: order.eventDoorsAt,
        venue: order.venue,
        city: order.city,
        address: order.address,
        tierKey: line.tierKey,
        tierName: line.tierName,
        priceCents: line.priceCents,
        feeCents: line.feeCents,
        ...(participantNames?.[index] !== undefined ? { participantName: participantNames[index] } : {}),
        issuedAt: now,
      })
    }
  }
  await ctx.db.patch("ticketOrders", order._id, { ticketsIssuedAt: now, emailAccessDigest: accessDigest.data })
  if (!delivery)
    await ctx.db.insert("ticketOrderDeliveries", {
      orderId: order._id,
      accessTokenSnapshot: accessToken,
      createdAt: now,
      updatedAt: now,
    })
  return createResult({ ticketCount: sequence, inventoryConflict: false })
}

async function ticketIssuedCodeCreate(ctx: MutationCtx, plannedCodes: ReadonlySet<string>): PromiseResult<string> {
  const op = "ticketIssuedCodeCreate"
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `TKT-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}`
    if (plannedCodes.has(code)) continue
    const existing = await ctx.db
      .query("ticketIssued")
      .withIndex("code", (q) => q.eq("code", code))
      .first()
    if (!existing) return createResult(code)
  }
  return createResultError(op, "Could not generate a unique ticket code")
}

function participantNamesRead(value: string | undefined): readonly string[] | undefined {
  if (value === undefined) return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || parsed.some((name) => typeof name !== "string" || name.trim().length === 0))
      return undefined
    return parsed
  } catch {
    return undefined
  }
}
