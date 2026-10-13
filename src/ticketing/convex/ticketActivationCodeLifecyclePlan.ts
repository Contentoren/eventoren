import type { Doc } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError } from "#result"

/** Read-only preflight. Result errors commit writes, so callers apply this only after ALL other preflights. */
export async function ticketActivationCodeLifecyclePlan(
  ctx: MutationCtx,
  order: Doc<"ticketOrders">,
  disposition: "release" | "consume",
) {
  const op = "ticketActivationCodeLifecyclePlan"
  // These are complete, order-scoped sets (one line/claim per selected product),
  // bounded by checkout transaction size, not the unbounded code reservation history.
  const lines = await ctx.db
    .query("ticketOrderLines")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .collect()
  const histories = await ctx.db
    .query("ticketActivationCodeReservations")
    .withIndex("orderId", (q) => q.eq("orderId", order._id))
    .collect()
  const requiredLines = lines.filter((line) => line.activationCodeId !== undefined)
  if (
    histories.length !== requiredLines.length ||
    new Set(histories.map((history) => history.codeId)).size !== histories.length ||
    new Set(requiredLines.map((line) => line.activationCodeId)).size !== requiredLines.length
  )
    return createResultError(op, "The activation code reservation history is incomplete")

  const changes: Array<{
    code: Doc<"ticketActivationCodes">
    history: Doc<"ticketActivationCodeReservations">
    codeDisposition?: "release" | "consume" | "charge_foreign_reservation"
    chargedOwnerId?: Doc<"ticketOrders">["_id"]
    historyStatus: "released" | "consumed"
  }> = []
  let hasOwnershipConflict = false
  for (const line of requiredLines) {
    const history = histories.find((candidate) => candidate.codeId === line.activationCodeId)
    const code = await ctx.db.get("ticketActivationCodes", line.activationCodeId!)
    if (
      !history ||
      !code ||
      history.tierId !== line.tierId ||
      history.eventKey !== order.eventKey ||
      history.tierKey !== line.tierKey ||
      code.tierId !== line.tierId ||
      code.eventKey !== order.eventKey ||
      code.tierKey !== line.tierKey ||
      code.eventId !== history.eventId
    )
      return createResultError(op, "The activation code reservation is corrupt")
    const identities = await ctx.db
      .query("ticketActivationCodes")
      .withIndex("code", (q) => q.eq("code", code.code))
      .take(2)
    if (!/^[A-Z0-9]{8}$/u.test(code.code) || identities.length !== 1 || identities[0]!._id !== code._id)
      return createResultError(op, "The activation code identity is corrupt")
    const active = await ctx.db
      .query("ticketActivationCodeReservations")
      .withIndex("codeIdAndStatusAndCreatedAt", (q) => q.eq("codeId", code._id).eq("status", "reserved"))
      .take(2)
    if (code.status === "reserved" ? active.length !== 1 || active[0]!.orderId !== code.orderId : active.length !== 0)
      return createResultError(op, "The activation code active ownership history is corrupt")

    // A durable consumedAt scar is necessary while a newer owner still holds the code.
    // Cross-check it against charged history so corruption can never reopen a paid code.
    const charged = await ctx.db
      .query("ticketActivationCodeReservations")
      .withIndex("codeIdAndStatusAndCreatedAt", (q) => q.eq("codeId", code._id).eq("status", "consumed"))
      .first()
    if ((code.consumedAt !== undefined) !== (charged !== null))
      return createResultError(op, "The activation code charged history is corrupt")
    if (charged) {
      const chargedOrder = await ctx.db.get("ticketOrders", charged.orderId)
      const chargedLines =
        charged.orderId === order._id
          ? lines
          : await ctx.db
              .query("ticketOrderLines")
              .withIndex("orderId", (q) => q.eq("orderId", charged.orderId))
              .collect()
      if (
        !chargedOrder ||
        (chargedOrder.paymentStatus !== "paid" && chargedOrder.ticketsIssuedAt === undefined) ||
        chargedOrder.eventKey !== code.eventKey ||
        (chargedOrder.status !== "paid" &&
          chargedOrder.status !== "paid_inventory_conflict" &&
          !(
            chargedOrder.paymentStatus === "pending" &&
            chargedOrder.ticketsIssuedAt !== undefined &&
            (chargedOrder.status === "reserved" || chargedOrder.status === "checkout_created")
          )) ||
        chargedLines.filter((candidate) => candidate.activationCodeId === code._id && candidate.tierId === code.tierId)
          .length !== 1 ||
        charged.tierId !== code.tierId ||
        charged.eventId !== code.eventId ||
        charged.eventKey !== code.eventKey ||
        charged.tierKey !== code.tierKey
      )
        return createResultError(op, "The activation code charged owner is corrupt")
    }

    if (code.status === "available") {
      if (code.orderId !== undefined || code.consumedAt !== undefined || history.status !== "released")
        return createResultError(op, "The activation code available ownership is corrupt")
    } else {
      if (code.orderId === undefined || (code.status === "consumed" && !charged))
        return createResultError(op, "The activation code owner is missing")
      const owner = code.orderId === order._id ? order : await ctx.db.get("ticketOrders", code.orderId)
      const ownerHistories =
        code.orderId === order._id
          ? histories
          : await ctx.db
              .query("ticketActivationCodeReservations")
              .withIndex("orderId", (q) => q.eq("orderId", code.orderId!))
              .collect()
      const ownerLines =
        code.orderId === order._id
          ? lines
          : await ctx.db
              .query("ticketOrderLines")
              .withIndex("orderId", (q) => q.eq("orderId", code.orderId!))
              .collect()
      const ownership = ownerHistories.filter((candidate) => candidate.codeId === code._id)
      if (
        !owner ||
        owner.eventKey !== code.eventKey ||
        ownerLines.filter((candidate) => candidate.activationCodeId === code._id && candidate.tierId === code.tierId)
          .length !== 1 ||
        ownership.length !== 1 ||
        ownership[0]!.tierId !== code.tierId ||
        ownership[0]!.eventId !== code.eventId ||
        ownership[0]!.eventKey !== code.eventKey ||
        ownership[0]!.tierKey !== code.tierKey ||
        (code.status === "reserved" &&
          (ownership[0]!.status !== "reserved" ||
            owner.paymentStatus !== "pending" ||
            (owner.status !== "reserved" && owner.status !== "checkout_created"))) ||
        (code.status === "consumed" &&
          (ownership[0]!.status !== "consumed" ||
            (owner.paymentStatus !== "paid" && owner.ticketsIssuedAt === undefined)))
      )
        return createResultError(op, "The activation code ownership history is corrupt")
    }

    const owned = code.orderId === order._id
    if (history.status === "reserved" && (!owned || code.status !== "reserved"))
      return createResultError(op, "The activation code active reservation is corrupt")
    if (history.status === "consumed" && order.paymentStatus !== "paid" && order.ticketsIssuedAt === undefined)
      return createResultError(op, "The activation code paid reservation is corrupt")
    if (disposition === "release") {
      if (history.status !== "reserved") continue
      changes.push({
        code,
        history,
        codeDisposition: "release",
        chargedOwnerId: charged?.orderId,
        historyStatus: "released",
      })
      continue
    }

    const foreignOwnership = !owned && code.status !== "available"
    hasOwnershipConflict ||= foreignOwnership
    changes.push({
      code,
      history,
      codeDisposition: foreignOwnership
        ? code.status === "reserved" && code.consumedAt === undefined
          ? "charge_foreign_reservation"
          : undefined
        : code.status !== "consumed"
          ? "consume"
          : undefined,
      historyStatus: "consumed",
    })
  }
  return createResult({ changes, hasOwnershipConflict })
}
