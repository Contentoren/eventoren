import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"

export type DashOrderRefundableTicket = {
  readonly ticketId: string
  readonly amountCents: number
  readonly refundable: boolean
}

export type DashOrderRefundable = {
  readonly maxCents: number
  readonly ticketMaxCents: number
  readonly feeRefundableCents: number
  readonly perTicket: DashOrderRefundableTicket[]
}

export function dashOrderRefundableGet(order: DashOrder, tickets: DashTicket[]): DashOrderRefundable {
  const op = "dashOrderRefundableGet"
  void op
  const lineTotal = order.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
  const discountTotal = order.discount?.amountCents ?? 0
  const refundedIds = new Set(order.refunds.flatMap((refund) => refund.ticketIds))
  const refundedAmount = order.refunds.reduce((sum, refund) => sum + refund.amountCents, 0)
  const refundedFee = order.refunds.reduce((sum, refund) => sum + (refund.feeCents ?? 0), 0)
  const slots = new Map<string, number[]>()
  for (const line of order.lines) {
    const list = slots.get(line.ticketTypeId) ?? []
    for (let index = 0; index < line.quantity; index += 1) list.push(line.unitPriceCents)
    slots.set(line.ticketTypeId, list)
  }
  const used = new Map<string, number>()
  const perTicket = tickets
    .filter((ticket) => ticket.orderId === order.id)
    .map((ticket) => {
      const prices = slots.get(ticket.ticketTypeId) ?? []
      const position = used.get(ticket.ticketTypeId) ?? 0
      used.set(ticket.ticketTypeId, position + 1)
      const unitPrice = prices[position] ?? prices[0] ?? 0
      const share = lineTotal > 0 && discountTotal > 0 ? Math.round((discountTotal * unitPrice) / lineTotal) : 0
      return {
        ticketId: ticket.id,
        amountCents: Math.max(0, unitPrice - share),
        refundable: ticket.status === "gueltig" && !refundedIds.has(ticket.id),
      }
    })
  return {
    maxCents: Math.max(0, order.totalCents - refundedAmount),
    ticketMaxCents: perTicket.reduce((sum, entry) => sum + (entry.refundable ? entry.amountCents : 0), 0),
    feeRefundableCents: Math.max(0, order.serviceFeeCents - refundedFee),
    perTicket,
  }
}
