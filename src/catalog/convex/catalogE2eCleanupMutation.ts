import { v } from "convex/values"
import { type MutationCtx, mutation } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "./catalogAdminAuthorizeFn.js"
import { catalogE2eCleanupEligibilityCheck } from "./catalogE2eCleanupEligibilityCheck.js"
import { catalogE2eOwnedEventCheck } from "./catalogE2eOwnedEventCheck.js"
import { catalogE2eOwnedGraphDelete } from "./catalogE2eOwnedGraphDelete.js"
import { catalogE2eOwnedGraphProve } from "./catalogE2eOwnedGraphProve.js"

const argsValidator = v.object({
  token: v.string(),
  runId: v.string(),
  eventKey: v.string(),
  eventTitle: v.string(),
  organizer: v.string(),
  eventId: v.optional(v.string()),
  productId: v.optional(v.string()),
  orderId: v.optional(v.string()),
  ticketId: v.optional(v.string()),
  participantName: v.string(),
  runCreatedAt: v.number(),
  successfulOwnedCurrentRun: v.boolean(),
})

/**
 * Authenticated full deletion of one checkpoint-proven E2E fixture graph:
 * catalog event/product, ticket orders, deliveries, lines, reservations, payment
 * attempts, fulfillment work, issued tickets and check-in history. Provider
 * artifacts (Stripe TEST objects, mail, PDFs) reconcile through the existing
 * provider helpers; shared users, files and scanner links are never touched.
 */
export const catalogE2eCleanupMutation = mutation({
  args: argsValidator,
  handler: async (ctx, args) => authMutationTokenToUserId(ctx, args, catalogE2eCleanupAuthorized),
})

async function catalogE2eCleanupAuthorized(
  ctx: MutationCtx,
  args: Omit<typeof argsValidator.type, "token"> & { userId: IdUser },
): PromiseResult<{
  eventKey: string
  eventDeleted: boolean
  alreadyCleaned: boolean
  product: "absent" | "deleted"
  deletedOrders: number
  deletedTickets: number
  deletedCheckInHistory: number
  paidHistory: "deleted" | "none"
  externalArtifacts: "stripe-imap-pdf-reconciled-separately"
}> {
  const op = "catalogE2eCleanupMutation"
  const admin = await catalogAdminAuthorizeFn(ctx, args.userId)
  if (!admin.success) return admin
  const event = await ctx.db
    .query("catalogEvents")
    .withIndex("eventKey", (q) => q.eq("eventKey", args.eventKey))
    .unique()
  if (!event) {
    // Idempotent re-entry: the markers must still prove an E2E fixture key and
    // no owned rows may remain. A wrong key fails marker agreement below.
    const owned = catalogE2eOwnedEventCheck({
      eventKey: args.eventKey,
      title: args.eventTitle,
      organizer: args.organizer,
    })
    if (!owned.success || owned.data !== args.runId)
      return createResultError(op, "Exact run event not found; no cleanup performed")
    const residualOrders = await ctx.db
      .query("ticketOrders")
      .withIndex("eventKeyAndCreatedAt", (q) => q.eq("eventKey", args.eventKey))
      .take(2)
    const residualTickets = await ctx.db
      .query("ticketIssued")
      .withIndex("eventKeyAndSequenceAndCode", (q) => q.eq("eventKey", args.eventKey))
      .take(2)
    if (residualOrders.length > 0 || residualTickets.length > 0)
      return createResultError(op, "Residual owned rows remain; reconcile manually")
    return createResult({
      eventKey: args.eventKey,
      eventDeleted: true,
      alreadyCleaned: true,
      product: args.productId ? ("deleted" as const) : ("absent" as const),
      deletedOrders: 0,
      deletedTickets: 0,
      deletedCheckInHistory: 0,
      paidHistory: "none" as const,
      externalArtifacts: "stripe-imap-pdf-reconciled-separately" as const,
    })
  }
  if (args.eventId !== undefined && args.eventId !== args.eventKey && args.eventId !== event._id)
    return createResultError(op, "Event identity does not match the checkpoint")
  const eligible = catalogE2eCleanupEligibilityCheck({
    runId: args.runId,
    eventKey: event.eventKey,
    title: event.title,
    organizer: event.organizer,
    createdAt: event._creationTime,
    now: Date.now(),
    runCreatedAt: args.runCreatedAt,
    successfulOwnedCurrentRun: args.successfulOwnedCurrentRun,
  })
  if (!eligible.success || args.eventTitle !== event.title || args.organizer !== event.organizer)
    return createResultError(op, "Event is not an eligible exact run/organizer fixture")

  const proven = await catalogE2eOwnedGraphProve(ctx, {
    event,
    earliestOrderCreationTime: args.runCreatedAt,
    checkpoint: { productId: args.productId, orderId: args.orderId, ticketId: args.ticketId },
  })
  if (!proven.success) return proven
  if (
    proven.data.tickets.some((ticket) => ticket.participantName !== args.participantName) ||
    proven.data.lines.some((line) => line.participantNamesJson !== JSON.stringify([args.participantName]))
  )
    return createResultError(op, "Issued ticket does not match the exact run")
  const deleted = await catalogE2eOwnedGraphDelete(ctx, args.userId, proven.data)
  if (!deleted.success) return deleted
  return createResult({
    eventKey: event.eventKey,
    eventDeleted: true,
    alreadyCleaned: false,
    product: proven.data.tier ? ("deleted" as const) : ("absent" as const),
    deletedOrders: deleted.data.deletedOrders,
    deletedTickets: deleted.data.deletedTickets,
    deletedCheckInHistory: deleted.data.deletedCheckInHistory,
    paidHistory: deleted.data.paidHistory,
    externalArtifacts: "stripe-imap-pdf-reconciled-separately" as const,
  })
}
