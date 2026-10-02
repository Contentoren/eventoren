import { v, type Infer } from "convex/values"

export const ticketPaymentReconcileScanValidator = v.object({
  stripeMode: v.union(v.literal("live"), v.literal("test")),
  now: v.number(),
  status: v.union(v.literal("expired"), v.literal("released")),
  cursor: v.union(v.string(), v.null()),
  activeOrderIds: v.optional(v.array(v.id("ticketOrders"))),
  selected: v.array(
    v.object({
      orderId: v.id("ticketOrders"),
      paymentReference: v.string(),
      billingOrderReference: v.optional(v.string()),
      stripeMode: v.union(v.literal("live"), v.literal("test")),
    }),
  ),
})

export type TicketPaymentReconcileScan = Infer<typeof ticketPaymentReconcileScanValidator>
