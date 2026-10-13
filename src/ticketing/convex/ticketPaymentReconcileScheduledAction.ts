import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalAction } from "#convex/_generated/server.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { billingEventorenClient } from "./billingEventorenClient.js"
import { ticketPaymentStatusApplyArgsCreate } from "./ticketPaymentStatusApplyArgsCreate.js"
import {
  ticketPaymentReconcileScanValidator,
  type TicketPaymentReconcileScan,
} from "./ticketPaymentReconcileScanValidator.js"

export const ticketPaymentReconcileScheduledAction = internalAction({
  args: { scan: v.optional(ticketPaymentReconcileScanValidator) },
  handler: async (ctx, args): PromiseResult<{ checked: number; fulfilled: number }> => {
    const op = "ticketPaymentReconcileScheduledAction"
    const config = billingEventorenClient.configRead()
    if (!config.success) return config
    const scan: TicketPaymentReconcileScan = args.scan ?? {
      stripeMode: config.data.stripeMode,
      now: Date.now(),
      status: "expired",
      cursor: null,
      selected: [],
    }
    if (
      scan.stripeMode !== config.data.stripeMode ||
      scan.selected.some((order) => order.stripeMode !== scan.stripeMode)
    )
      return createResultError(op, "The reconciliation Stripe mode changed")
    if (scan.selected.length >= 25)
      return createResultError(op, "A continuation must have fewer than 25 selected orders")
    if ((scan.activeOrderIds?.length ?? 0) > 50)
      return createResultError(op, "A continuation cannot exclude more than the two active status caps")
    const contexts: TicketPaymentReconcileScan["selected"] = []
    if (!args.scan) {
      const initial = await ctx.runQuery(internal.ticketing.ticketPaymentReconcileScheduledContextQuery, {
        stripeMode: scan.stripeMode,
        now: scan.now,
      })
      if (!initial.success) return initial
      contexts.push(...initial.data)
      // These orders were selected in active statuses at scan start. If Billing
      // expires them below, they must not consume terminal slots later in this
      // same chain (the previous combined query selected before any writes).
      scan.activeOrderIds = initial.data.map((order) => order.orderId)
    }
    // One bounded terminal page per invocation; never loop over empty pages.
    const page = await ctx.runQuery(internal.ticketing.ticketPaymentReconcileTerminalPageQuery, {
      stripeMode: scan.stripeMode,
      now: scan.now,
      status: scan.status,
      cursor: scan.cursor,
      numItems: 25 - scan.selected.length,
    })
    if (!page.success) return page
    // Other cron runs may update a selected row's updatedAt during this scan.
    // Keep each order at most once in the per-status selection, while advancing
    // even over pages containing only previously selected rows.
    const selectedIds = new Set(scan.selected.map((order) => order.orderId))
    const activeIds = new Set(scan.activeOrderIds)
    const selected = [
      ...scan.selected,
      ...page.data.contexts.filter((order) => !selectedIds.has(order.orderId) && !activeIds.has(order.orderId)),
    ]
    const selectionDone = page.data.isDone || selected.length === 25
    // Do not reconcile partial selections: our own updatedAt writes would move
    // selected rows past the cursor and could select them twice within the cap.
    if (selectionDone) contexts.push(...selected)
    const continuation: TicketPaymentReconcileScan | undefined = !selectionDone
      ? { ...scan, cursor: page.data.continueCursor, selected }
      : scan.status === "expired"
        ? { ...scan, status: "released", cursor: null, selected: [] }
        : undefined
    let checked = 0
    for (const context of contexts) {
      const status = await billingEventorenClient.statusGet(config.data, context.paymentReference)
      if (!status.success || status.data.kind === "not_found") {
        const recorded = await ctx.runMutation(internal.ticketing.ticketPaymentReconcileFailureMutation, {
          orderId: context.orderId,
          paymentReference: context.paymentReference,
          stripeMode: context.stripeMode,
          errorMessage: status.success ? "Billing returned no payment for the checkout" : status.errorMessage,
        })
        if (!recorded.success) return recorded
        continue
      }
      checked += 1
      const payment = status.data.data
      if (payment.payment === "expired") {
        const expired = await ctx.runMutation(internal.ticketing.ticketReservationExpireMutation, {
          orderId: context.orderId,
          paymentReference: payment.paymentReference,
          billingOrderReference: payment.orderReference,
          stripeMode: payment.stripeMode,
          reason: "Billing confirmed that the checkout session expired",
        })
        if (!expired.success) {
          const recorded = await ctx.runMutation(internal.ticketing.ticketPaymentReconcileFailureMutation, {
            orderId: context.orderId,
            paymentReference: context.paymentReference,
            stripeMode: context.stripeMode,
            errorMessage: expired.errorMessage,
          })
          if (!recorded.success) return recorded
        }
        continue
      }
      const applied = await ctx.runMutation(
        internal.ticketing.ticketPaymentStatusApplyMutation,
        ticketPaymentStatusApplyArgsCreate(context.orderId, { ...payment, payment: payment.payment }),
      )
      if (!applied.success) {
        const recorded = await ctx.runMutation(internal.ticketing.ticketPaymentReconcileFailureMutation, {
          orderId: context.orderId,
          paymentReference: context.paymentReference,
          stripeMode: context.stripeMode,
          errorMessage: applied.errorMessage,
        })
        if (!recorded.success) return recorded
      }
    }

    if (continuation)
      await ctx.scheduler.runAfter(0, internal.ticketing.ticketPaymentReconcileScheduledAction, { scan: continuation })

    return createResult({ checked, fulfilled: 0 })
  },
})
