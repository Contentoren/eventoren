import { createResult, createResultError, type Result } from "#result"

import type { DashCode } from "./dashCodeSchema.ts"
import { dashDiscountCompute } from "./dashDiscountCompute.ts"
import type { DashFee } from "./dashFeeSchema.ts"
import { dashFeeCompute } from "./dashFeeCompute.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashPaymentMethod } from "./dashPaymentMethodSchema.ts"
import { dashPaymentCostCompute } from "./dashPaymentCostCompute.ts"
import type { DashTicket } from "./dashTicketSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"
import type { DashVoucher } from "./dashVoucherSchema.ts"

export type DashOrderBuildLine = {
  ticketTypeId: string
  phaseId: string
  unitPriceCents: number
  quantity: number
}

export type DashOrderBuildHolder = {
  name: string
  email: string
}

export function dashOrderBuild(args: {
  id: string
  number: string
  org: { id: string; fee: DashFee }
  event: { id: string }
  ticketTypes: DashTicketType[]
  lines: DashOrderBuildLine[]
  buyer: { firstName: string; lastName: string; email: string }
  holders?: DashOrderBuildHolder[]
  createdAt: string
  channel: DashOrder["channel"]
  method: DashPaymentMethod
  status?: DashOrder["status"]
  code?: DashCode | null
  voucher?: { voucher: DashVoucher; amountCents: number } | null
  ticketIdCreate: () => string
  ticketCodeCreate: () => string
  invoiceNumber: string | null
}): Result<{ order: DashOrder; tickets: DashTicket[] }> {
  const op = "dashOrderBuild"
  const { id, number, org, event, ticketTypes, lines, buyer, createdAt, channel, voucher } = args
  const status = args.status ?? "bezahlt"
  const holders = args.holders ?? []
  if (lines.length === 0) return createResultError(op, "Die Bestellung braucht mindestens eine Position.")
  const typeById = new Map(ticketTypes.map((type) => [type.id, type]))
  for (const line of lines) {
    const type = typeById.get(line.ticketTypeId)
    if (!type) return createResultError(op, `Unbekannte Ticketart ${line.ticketTypeId}.`)
    if (!type.phases.some((phase) => phase.id === line.phaseId))
      return createResultError(op, `Unbekannte Phase ${line.phaseId} für ${type.name}.`)
    if (line.quantity < 1) return createResultError(op, "Die Menge muss mindestens 1 sein.")
    if (line.unitPriceCents < 0) return createResultError(op, "Der Preis darf nicht negativ sein.")
  }

  const now = new Date(createdAt)
  const discountInput = args.code ?? null
  let discount: DashOrder["discount"] = null
  let discountCents = 0
  if (discountInput !== null) {
    if (discountInput.kind === "rabatt") {
      const computed = dashDiscountCompute({
        code: discountInput,
        lines: lines.map((line) => ({
          ticketTypeId: line.ticketTypeId,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
        })),
        now,
      })
      if (!computed.success) return createResultError(op, computed.errorMessage)
      discountCents = computed.data.amountCents
      discount = { codeId: discountInput.id, code: discountInput.code, amountCents: computed.data.amountCents }
    } else {
      discount = { codeId: discountInput.id, code: discountInput.code, amountCents: 0 }
    }
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
  const afterDiscountCents = subtotalCents - discountCents
  if (afterDiscountCents < 0) return createResultError(op, "Der Rabatt ist höher als die Summe der Positionen.")

  const voucherUse = voucher ?? null
  let voucherCents = 0
  let voucherRecord: DashOrder["voucher"] = null
  const serviceFeeCents =
    org.fee.payer === "kaeufer"
      ? lines.reduce(
          (sum, line) =>
            sum + line.quantity * dashFeeCompute({ priceCents: line.unitPriceCents, fee: org.fee }).feeCents,
          0,
        )
      : 0
  const totalCents = afterDiscountCents + serviceFeeCents
  if (voucherUse !== null) {
    if (voucherUse.amountCents < 0) return createResultError(op, "Der Gutscheinbetrag darf nicht negativ sein.")
    if (voucherUse.amountCents > totalCents)
      return createResultError(op, "Der Gutscheinbetrag ist höher als der zu zahlende Betrag.")
    voucherCents = voucherUse.amountCents
    if (voucherCents > 0)
      voucherRecord = {
        voucherId: voucherUse.voucher.id,
        code: voucherUse.voucher.code,
        amountCents: voucherCents,
      }
  }

  const paidByMethodCents = totalCents - voucherCents
  let method = args.method
  if (paidByMethodCents === 0) method = voucherCents > 0 ? "gutschein" : "kostenlos"
  const costCents = dashPaymentCostCompute(method, paidByMethodCents)

  const orderLines: DashOrder["lines"] = lines.map((line) => {
    const type = typeById.get(line.ticketTypeId)
    return {
      ticketTypeId: line.ticketTypeId,
      phaseId: line.phaseId,
      name: type?.name ?? line.ticketTypeId,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      taxRateBps: type?.taxRateBps ?? 700,
    }
  })

  const buyerName = `${buyer.firstName} ${buyer.lastName}`.trim()
  const tickets: DashTicket[] = []
  let seat = 0
  for (const line of lines) {
    for (let index = 0; index < line.quantity; index += 1) {
      const holder = holders[seat]
      seat += 1
      tickets.push({
        id: args.ticketIdCreate(),
        orderId: id,
        eventId: event.id,
        ticketTypeId: line.ticketTypeId,
        code: args.ticketCodeCreate(),
        holderName: holder?.name ?? buyerName,
        holderEmail: holder?.email ?? buyer.email,
        status: "gueltig",
        checkedInAt: null,
        entrance: null,
      })
    }
  }

  const order: DashOrder = {
    id,
    number,
    orgId: org.id,
    eventId: event.id,
    channel,
    createdAt,
    buyer: { firstName: buyer.firstName, lastName: buyer.lastName, email: buyer.email },
    status,
    payment: { method, costCents },
    lines: orderLines,
    discount,
    voucher: voucherRecord,
    serviceFeeCents,
    totalCents,
    refunds: [],
    chargeback: null,
    notes: [],
    emails: [{ at: createdAt, to: buyer.email, kind: "bestaetigung" }],
    invoiceNumber: args.invoiceNumber ?? "",
  }
  return createResult({ order, tickets })
}
