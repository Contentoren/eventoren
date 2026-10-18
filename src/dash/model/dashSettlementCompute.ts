import { dashFeeCompute } from "./dashFeeCompute.ts"
import { dashOrderTicketRefunds } from "./dashOrderTicketRefunds.ts"
import { dashOrderTicketValue } from "./dashOrderTicketValue.ts"
import { dashTaxCompute } from "./dashTaxCompute.ts"
import type { DashEvent } from "./dashEventSchema.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashOrg } from "./dashOrgSchema.ts"
import type { DashPaymentMethod } from "./dashPaymentMethodSchema.ts"
import type { DashTicket } from "./dashTicketSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"

const includedStatus = new Set<DashOrder["status"]>(["bezahlt", "teilerstattet", "erstattet", "storniert"])

export function dashSettlementCompute(args: {
  event: DashEvent
  ticketTypes: DashTicketType[]
  orders: DashOrder[]
  tickets: DashTicket[]
  org: DashOrg
}): {
  includedOrders: number
  ticketRevenueCents: number
  refundsCents: number
  refundedFeesCents: number
  chargebacksCents: number
  platformFeeCents: number
  paymentCostsCents: number
  buyerFeesCents: number
  voucherPaidCents: number
  openOrders: { count: number; amountCents: number }
  taxByRate: { rateBps: number; grossCents: number; netCents: number; taxCents: number }[]
  byTicketType: {
    ticketTypeId: string
    name: string
    sold: number
    grossCents: number
    netCents: number
    taxCents: number
  }[]
  byPaymentMethod: { method: DashPaymentMethod; orders: number; amountCents: number; costCents: number }[]
  payoutCents: number
} {
  const { event, ticketTypes, orders, tickets, org } = args
  const eventTypes = ticketTypes.filter((type) => type.eventId === event.id)
  const eventOrders = orders.filter((order) => order.eventId === event.id)

  const settled = eventOrders.filter((order) => includedStatus.has(order.status))
  const open = eventOrders.filter((order) => order.status === "offen")

  const ticketRevenue = settled.reduce((sum, order) => sum + dashOrderTicketValue(order), 0)
  const refunds = settled.reduce((sum, order) => sum + dashOrderTicketRefunds(order), 0)
  const refundedFees = settled.reduce(
    (sum, order) => sum + order.refunds.reduce((inner, refund) => inner + (refund.feeCents ?? 0), 0),
    0,
  )
  const chargebacks = settled.reduce(
    (sum, order) => sum + (order.chargeback === null ? 0 : order.chargeback.amountCents + order.chargeback.feeCents),
    0,
  )
  const platformFee =
    org.fee.payer === "veranstalter"
      ? settled.reduce(
          (sum, order) =>
            sum +
            order.lines.reduce(
              (inner, line) =>
                inner + line.quantity * dashFeeCompute({ priceCents: line.unitPriceCents, fee: org.fee }).feeCents,
              0,
            ),
          0,
        )
      : 0
  const paymentCosts = settled.reduce((sum, order) => sum + order.payment.costCents, 0)
  const buyerFees = org.fee.payer === "kaeufer" ? settled.reduce((sum, order) => sum + order.serviceFeeCents, 0) : 0
  const voucherPaid = settled.reduce((sum, order) => sum + (order.voucher?.amountCents ?? 0), 0)

  const grossByType = new Map<string, number>()
  const grossByRate = new Map<number, number>()
  for (const order of settled) {
    const lineValues = order.lines.map((line) => line.unitPriceCents * line.quantity)
    const deductions = Math.min(
      (order.discount?.amountCents ?? 0) + dashOrderTicketRefunds(order),
      lineValues.reduce((sum, value) => sum + value, 0),
    )
    const shares = allocate(lineValues, deductions)
    order.lines.forEach((line, index) => {
      const net = lineValues[index]! - (shares[index] ?? 0)
      grossByType.set(line.ticketTypeId, (grossByType.get(line.ticketTypeId) ?? 0) + net)
      grossByRate.set(line.taxRateBps, (grossByRate.get(line.taxRateBps) ?? 0) + net)
    })
  }

  const taxByRate = [...grossByRate.entries()]
    .sort(([left], [right]) => left - right)
    .map(([rateBps, grossCents]) => {
      const { netCents, taxCents } = dashTaxCompute({ grossCents, rateBps, status: org.tax.status })
      return { rateBps, grossCents, netCents, taxCents }
    })

  const settledIds = new Set(settled.map((order) => order.id))
  const soldByType = new Map<string, number>()
  for (const ticket of tickets) {
    if (ticket.eventId !== event.id) continue
    if (ticket.status !== "gueltig") continue
    if (!settledIds.has(ticket.orderId)) continue
    soldByType.set(ticket.ticketTypeId, (soldByType.get(ticket.ticketTypeId) ?? 0) + 1)
  }

  const byTicketType = eventTypes.map((type) => {
    const grossCents = grossByType.get(type.id) ?? 0
    const { netCents, taxCents } = dashTaxCompute({ grossCents, rateBps: type.taxRateBps, status: org.tax.status })
    return {
      ticketTypeId: type.id,
      name: type.name,
      sold: soldByType.get(type.id) ?? 0,
      grossCents,
      netCents,
      taxCents,
    }
  })

  const payments = new Map<DashPaymentMethod, { orders: number; amountCents: number; costCents: number }>()
  for (const order of settled) {
    const current = payments.get(order.payment.method) ?? { orders: 0, amountCents: 0, costCents: 0 }
    current.orders += 1
    current.amountCents += order.totalCents
    current.costCents += order.payment.costCents
    payments.set(order.payment.method, current)
  }
  const byPaymentMethod = [...payments.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([method, stats]) => ({ method, ...stats }))

  return {
    includedOrders: settled.length,
    ticketRevenueCents: ticketRevenue,
    refundsCents: refunds,
    refundedFeesCents: refundedFees,
    chargebacksCents: chargebacks,
    platformFeeCents: platformFee,
    paymentCostsCents: paymentCosts,
    buyerFeesCents: buyerFees,
    voucherPaidCents: voucherPaid,
    openOrders: { count: open.length, amountCents: open.reduce((sum, order) => sum + order.totalCents, 0) },
    taxByRate,
    byTicketType,
    byPaymentMethod,
    payoutCents: ticketRevenue - refunds - chargebacks - platformFee - paymentCosts,
  }
}

function allocate(values: number[], total: number): number[] {
  const shares = values.map(() => 0)
  if (total === 0 || values.length === 0) return shares
  const sum = values.reduce((left, right) => left + right, 0)
  if (sum === 0) return shares
  const exact = values.map((value) => (value / sum) * total)
  const floors = exact.map((value) => Math.floor(value))
  const order = exact
    .map((value, index) => ({ index, rest: value - (floors[index] ?? 0) }))
    .sort((left, right) => right.rest - left.rest)
  let rest = total - floors.reduce((left, right) => left + right, 0)
  for (const entry of order) {
    if (rest <= 0) break
    floors[entry.index] = (floors[entry.index] ?? 0) + 1
    rest -= 1
  }
  return floors
}
