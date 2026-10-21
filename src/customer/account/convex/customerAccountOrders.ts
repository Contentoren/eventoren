import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { mutation, query } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { authQueryTokenToUserId } from "#src/utils/convex_backend/authQueryTokenToUserId.ts"
import type { TicketOrderSummary } from "#src/ticketing/TicketOrderSummary.ts"
import { customerAccountInvoiceCreate, type CustomerAccountInvoice } from "../model/customerAccountInvoiceCreate.ts"

const maxPageSize = 50
const maxPageBytes = 512 * 1024

function orderSummaryOf(order: {
  readonly _id: unknown
  readonly checkoutKey: string
  readonly eventKey: string
  readonly eventTitle: string
  readonly eventSubtitle: string
  readonly eventStartsAt: string
  readonly eventEndsAt: string
  readonly eventDoorsAt: string
  readonly venue: string
  readonly city: string
  readonly address: string
  readonly organizer: string
  readonly imageUrl: string
  readonly imageAlt: string
  readonly catalogVersion: number
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
  readonly bookingNumber?: number
  readonly bookingReference?: string
  readonly status: TicketOrderSummary["status"]
  readonly paymentStatus: TicketOrderSummary["paymentStatus"]
  readonly createdAt: string
  readonly updatedAt: string
  readonly ticketsIssuedAt?: string
  readonly paymentMethodType?: string
}): TicketOrderSummary {
  return {
    id: String(order._id),
    checkoutKey: order.checkoutKey,
    eventKey: order.eventKey,
    eventTitle: order.eventTitle,
    eventSubtitle: order.eventSubtitle,
    eventStartsAt: order.eventStartsAt,
    eventEndsAt: order.eventEndsAt,
    eventDoorsAt: order.eventDoorsAt,
    venue: order.venue,
    city: order.city,
    address: order.address,
    organizer: order.organizer,
    imageUrl: order.imageUrl,
    imageAlt: order.imageAlt,
    catalogVersion: order.catalogVersion,
    subtotalCents: order.subtotalCents,
    feeCents: order.feeCents,
    totalCents: order.totalCents,
    ...(order.bookingNumber !== undefined ? { bookingNumber: order.bookingNumber } : {}),
    ...(order.bookingReference !== undefined ? { bookingReference: order.bookingReference } : {}),
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    ...(order.ticketsIssuedAt !== undefined ? { ticketsIssuedAt: order.ticketsIssuedAt } : {}),
    ...(order.paymentMethodType !== undefined ? { paymentMethodType: order.paymentMethodType } : {}),
  }
}

/** Own orders of the authenticated customer, newest first. */
export const customerAccountOrderListQuery = query({
  args: { token: v.string(), paginationOpts: paginationOptsValidator },
  handler: (ctx, args): PromiseResult<{ page: TicketOrderSummary[]; isDone: boolean; continueCursor: string }> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, paginationOpts }) => {
      const op = "customerAccountOrderListQuery"
      if (
        !Number.isInteger(paginationOpts.numItems) ||
        paginationOpts.numItems < 1 ||
        paginationOpts.numItems > maxPageSize
      ) {
        return createResultError(op, "Seitengröße muss 1 bis 50 sein")
      }
      const page = await queryCtx.db
        .query("ticketOrders")
        .withIndex("ownerUserIdAndCreatedAt", (q) => q.eq("ownerUserId", userId))
        .order("desc")
        .paginate({
          cursor: paginationOpts.cursor,
          endCursor: paginationOpts.endCursor,
          numItems: paginationOpts.numItems,
          maximumRowsRead: maxPageSize,
          maximumBytesRead: maxPageBytes,
        })
      return createResult({ ...page, page: page.page.map((order) => orderSummaryOf(order)) })
    }),
})

export type CustomerAccountOrderDetail = {
  readonly order: TicketOrderSummary
  readonly tickets: { readonly code: string; readonly tierName: string; readonly checkedInAt: string | null }[]
  readonly invoice: CustomerAccountInvoice | null
}

/**
 * Own order detail with tickets and — for paid orders only — a read-only
 * invoice projection from canonical snapshots. Checkout URLs, digests and
 * secrets are never projected.
 */
export const customerAccountOrderGetQuery = query({
  args: { token: v.string(), orderId: v.id("ticketOrders") },
  handler: (ctx, args): PromiseResult<CustomerAccountOrderDetail> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId, orderId }) => {
      const op = "customerAccountOrderGetQuery"
      const order = await queryCtx.db.get("ticketOrders", orderId)
      if (!order || order.ownerUserId === undefined || String(order.ownerUserId) !== String(userId)) {
        return createResultError(op, "Bestellung nicht gefunden")
      }
      const tickets = await queryCtx.db
        .query("ticketIssued")
        .withIndex("orderIdAndSequence", (q) => q.eq("orderId", orderId))
        .take(51)
      const lines = await queryCtx.db
        .query("ticketOrderLines")
        .withIndex("orderId", (q) => q.eq("orderId", orderId))
        .take(51)
      const paid = order.status === "paid" && order.paymentStatus === "paid"
      return createResult({
        order: orderSummaryOf(order),
        tickets: tickets.slice(0, 50).map((ticket) => ({
          code: ticket.code,
          tierName: ticket.tierName,
          checkedInAt: ticket.checkedInAt ?? null,
        })),
        invoice: paid
          ? customerAccountInvoiceCreate({
              ...(order.bookingReference !== undefined ? { bookingReference: order.bookingReference } : {}),
              ...(order.bookingNumber !== undefined ? { bookingNumber: order.bookingNumber } : {}),
              ...(order.paidAt !== undefined ? { paidAt: order.paidAt } : {}),
              ...(order.checkoutCompletedAt !== undefined ? { checkoutCompletedAt: order.checkoutCompletedAt } : {}),
              buyerName:
                `${order.customerGivenName ?? ""} ${order.customerFamilyName ?? ""}`.trim() || order.customerEmail,
              buyerEmail: order.customerEmail,
              eventTitle: order.eventTitle,
              lines: lines
                .slice(0, 50)
                .filter((line) => line.eventKey === order.eventKey)
                .map((line) => ({ name: line.tierName, quantity: line.quantity, unitPriceCents: line.priceCents })),
              subtotalCents: order.subtotalCents,
              feeCents: order.feeCents,
              totalCents: order.totalCents,
            })
          : null,
      })
    }),
})

export type CustomerAccountProfile = { readonly name: string; readonly email: string | null }

/** Own profile: display name plus read-only e-mail. */
export const customerAccountProfileGetQuery = query({
  args: { token: v.string() },
  handler: (ctx, args): PromiseResult<CustomerAccountProfile> =>
    authQueryTokenToUserId(ctx, args, async (queryCtx, { userId }) => {
      const op = "customerAccountProfileGetQuery"
      const user = await queryCtx.db.get("users", userId as Id<"users">)
      if (!user) return createResultError(op, "User not found")
      return createResult({ name: user.name, email: user.email ?? null })
    }),
})

/** Updates the own display name; e-mail stays identity-owned and read-only. */
export const customerAccountProfileUpdateMutation = mutation({
  args: { token: v.string(), name: v.string() },
  handler: (ctx, args): PromiseResult<CustomerAccountProfile> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, name }) => {
      const op = "customerAccountProfileUpdateMutation"
      const trimmed = name.trim()
      if (trimmed.length === 0 || trimmed.length > 120) {
        return createResultError(op, "Name muss 1 bis 120 Zeichen haben")
      }
      const user = await mutationCtx.db.get("users", userId as Id<"users">)
      if (!user) return createResultError(op, "User not found")
      await mutationCtx.db.patch("users", user._id, { name: trimmed })
      return createResult({ name: trimmed, email: user.email ?? null })
    }),
})
