import { createResult, createResultError, type Result } from "#result"
import * as v from "valibot"

import { eventPriceFormat } from "../../../events/eventPriceFormat.ts"
import type { DashEntrance } from "../../model/dashEntranceSchema.ts"
import type { DashOrder } from "../../model/dashOrderSchema.ts"
import { dashOrderBuyerSchema } from "../../model/dashOrderBuyerSchema.ts"
import type { DashTicket } from "../../model/dashTicketSchema.ts"
import { dashCodeGenerate } from "../../model/dashCodeGenerate.ts"
import { dashCodeValidate } from "../../model/dashCodeValidate.ts"
import { dashDiscountCompute } from "../../model/dashDiscountCompute.ts"
import { dashFeeCompute } from "../../model/dashFeeCompute.ts"
import { dashOrderBuild, type DashOrderBuildHolder } from "../../model/dashOrderBuild.ts"
import type { DashOrderChannel } from "../../model/dashOrderChannelSchema.ts"
import type { DashPaymentMethod } from "../../model/dashPaymentMethodSchema.ts"
import { dashPhaseResolve } from "../../model/dashPhaseResolve.ts"
import { dashRandomCreate } from "../../model/dashRandomCreate.ts"
import { dashTicketTypeSales } from "../../model/dashTicketTypeSales.ts"
import { dashAuditAdd } from "../dashAuditAdd.ts"
import type { DashStore } from "../dashStoreCreate.ts"
import { dashIdCreate } from "../dashIdCreate.ts"
import { dashStoreGet } from "../dashStoreGet.ts"

export type DashOrderCreateInput = {
  eventId: string
  lines: { ticketTypeId: string; quantity: number }[]
  buyer: { firstName: string; lastName: string; email: string }
  holders?: DashOrderBuildHolder[]
  channel: DashOrderChannel
  method: DashPaymentMethod
  codeInput?: string
  voucherCode?: string
  checkIn?: { entrance: DashEntrance; device: string }
}

const dashOrderChannels: DashOrderChannel[] = ["online", "abendkasse", "gaesteliste"]
const dashOrderMethods: DashPaymentMethod[] = [
  "karte",
  "paypal",
  "sepa",
  "applepay",
  "googlepay",
  "gutschein",
  "kostenlos",
]

function dashOrderNextNumber(existing: string[], prefix: RegExp, fallback: string): string {
  let max = -1
  for (const value of existing) {
    const match = prefix.exec(value)
    if (match) max = Math.max(max, Number(match[1]))
  }
  if (max < 0) return fallback
  const head = fallback.replace(/\d+$/, "")
  return `${head}${max + 1}`
}

export function dashOrderCreate(
  input: DashOrderCreateInput,
  store: DashStore = dashStoreGet(),
): Result<{
  order: DashOrder
  tickets: DashTicket[]
}> {
  const op = "dashOrderCreate"
  const now = new Date()
  const nowIso = now.toISOString()
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  const org = store.state.orgs.find((candidate) => candidate.id === event.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  if (!v.safeParse(dashOrderBuyerSchema, input.buyer).success)
    return createResultError(op, "Bitte prüfe die Käuferdaten.")
  if (input.buyer.firstName.trim() === "" || input.buyer.lastName.trim() === "" || !input.buyer.email.includes("@"))
    return createResultError(op, "Bitte prüfe die Käuferdaten.")
  if (!dashOrderChannels.includes(input.channel)) return createResultError(op, "Unbekannter Verkaufskanal.")
  if (!dashOrderMethods.includes(input.method)) return createResultError(op, "Unbekannte Zahlart.")
  if (input.lines.length === 0) return createResultError(op, "Die Bestellung braucht mindestens eine Position.")

  const resolved: { ticketTypeId: string; phaseId: string; unitPriceCents: number; quantity: number; name: string }[] =
    []
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      return createResultError(op, "Die Menge muss mindestens 1 sein.")
    const ticketType = store.state.ticketTypes.find((candidate) => candidate.id === line.ticketTypeId)
    if (!ticketType || ticketType.eventId !== event.id)
      return createResultError(op, "Eine Ticketart gehört nicht zu diesem Event.")
    if (ticketType.archivedAt !== null) return createResultError(op, `„${ticketType.name}“ ist archiviert.`)
    if (line.quantity > ticketType.maxPerOrder)
      return createResultError(op, `Maximal ${ticketType.maxPerOrder} × „${ticketType.name}“ je Bestellung.`)
    const sales = dashTicketTypeSales({ ticketType, orders: store.state.orders, tickets: store.state.tickets })
    const phase = dashPhaseResolve(ticketType, sales.soldByPhase, now)
    if (phase.state === "ausverkauft") return createResultError(op, `„${ticketType.name}“ ist ausverkauft.`)
    if (!phase.phase) {
      if (phase.state === "geplant")
        return createResultError(op, `Der Verkauf für „${ticketType.name}“ hat noch nicht begonnen.`)
      return createResultError(op, `„${ticketType.name}“ ist nicht mehr verfügbar.`)
    }
    if (sales.available < line.quantity)
      return createResultError(op, `Für „${ticketType.name}“ sind nur noch ${sales.available} Tickets verfügbar.`)
    if (phase.remainingInPhase !== null && phase.remainingInPhase < line.quantity)
      return createResultError(
        op,
        `In Phase „${phase.phase.name}“ sind nur noch ${phase.remainingInPhase} Tickets verfügbar.`,
      )
    resolved.push({
      ticketTypeId: ticketType.id,
      phaseId: phase.phase.id,
      unitPriceCents: phase.phase.priceCents,
      quantity: line.quantity,
      name: ticketType.name,
    })
  }

  const typeById = new Map(store.state.ticketTypes.map((type) => [type.id, type]))
  let code: NonNullable<Parameters<typeof dashOrderBuild>[0]["code"]> | null = null
  let discountCents = 0
  let codeTicketIncrement = 0
  if (input.codeInput !== undefined && input.codeInput.trim() !== "") {
    const validated = dashCodeValidate({ input: input.codeInput, codes: store.state.codes, eventId: event.id, now })
    if (!validated.success) return createResultError(op, validated.errorMessage)
    code = validated.data
    const covered = (ticketTypeId: string) =>
      code !== null && (code.ticketTypeIds.length === 0 || code.ticketTypeIds.includes(ticketTypeId))
    for (const line of resolved) {
      const type = typeById.get(line.ticketTypeId)
      if (type?.hidden && (code.kind !== "zugang" || !covered(line.ticketTypeId)))
        return createResultError(op, `„${line.name}“ ist nur mit Zugangscode erhältlich.`)
    }
    if (code.kind === "rabatt") {
      const computed = dashDiscountCompute({
        code,
        lines: resolved,
        usedTickets: code.usedTickets,
        now,
      })
      if (!computed.success) return createResultError(op, computed.errorMessage)
      const eligibleTotal = resolved
        .filter(
          (line) =>
            code !== null && (code.ticketTypeIds.length === 0 || code.ticketTypeIds.includes(line.ticketTypeId)),
        )
        .reduce((sum, line) => sum + line.quantity, 0)
      if (code.maxTickets !== null && code.usedTickets + eligibleTotal > code.maxTickets)
        return createResultError(op, "Der Code reicht nicht für diese Bestellung.")
      discountCents = computed.data.amountCents
      codeTicketIncrement = computed.data.appliedTickets
    } else {
      if (
        code.ticketTypeIds.length > 0 &&
        !resolved.some((line) => code !== null && code.ticketTypeIds.includes(line.ticketTypeId))
      )
        return createResultError(op, "Code gilt nicht für diese Tickets")
      codeTicketIncrement = resolved
        .filter((line) => covered(line.ticketTypeId))
        .reduce((sum, line) => sum + line.quantity, 0)
    }
  } else {
    for (const line of resolved) {
      const type = typeById.get(line.ticketTypeId)
      if (type?.hidden) return createResultError(op, `„${line.name}“ ist nur mit Zugangscode erhältlich.`)
    }
  }

  const subtotalCents = resolved.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
  const afterDiscountCents = subtotalCents - discountCents
  const serviceFeeCents =
    org.fee.payer === "kaeufer"
      ? resolved.reduce(
          (sum, line) =>
            sum + line.quantity * dashFeeCompute({ priceCents: line.unitPriceCents, fee: org.fee }).feeCents,
          0,
        )
      : 0
  const totalBeforeVoucherCents = afterDiscountCents + serviceFeeCents
  let voucher: { voucherId: string; amountCents: number } | null = null
  const voucherCode = input.voucherCode
  const foundVoucher =
    voucherCode === undefined || voucherCode.trim() === ""
      ? null
      : store.state.vouchers.find(
          (candidate) => candidate.orgId === org.id && candidate.code === voucherCode.trim().toUpperCase(),
        )
  if (voucherCode !== undefined && voucherCode.trim() !== "") {
    if (!foundVoucher) return createResultError(op, "Gutschein nicht gefunden.")
    if (foundVoucher.status !== "aktiv") return createResultError(op, "Der Gutschein ist nicht aktiv.")
    if (foundVoucher.expiresAt !== null && Date.parse(foundVoucher.expiresAt) < now.getTime())
      return createResultError(op, "Der Gutschein ist abgelaufen.")
    // Der Gutschein deckt die Summe inkl. Servicegebühr (Modell-Regel aus
    // dashOrderBuild/dashSeedOrdersApply: totalCents enthält den Gutschein
    // nicht als Abzug, bezahlt wird totalCents - voucher).
    const amount = Math.min(foundVoucher.balanceCents, totalBeforeVoucherCents)
    if (amount > 0) voucher = { voucherId: foundVoucher.id, amountCents: amount }
  }

  const totalCents = totalBeforeVoucherCents
  const paidByMethodCents = totalCents - (voucher?.amountCents ?? 0)

  const number = dashOrderNextNumber(
    store.state.orders.map((order) => order.number),
    /^EV-(\d+)$/,
    "EV-260001",
  )
  const invoiceNumber =
    paidByMethodCents > 0
      ? dashOrderNextNumber(
          store.state.orders.map((order) => order.invoiceNumber).filter((value) => value !== ""),
          /^RE-2026-(\d+)$/,
          "RE-2026-1",
        )
      : null

  const totalQuantity = resolved.reduce((sum, line) => sum + line.quantity, 0)
  const random = dashRandomCreate((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0)
  const rawCodes = dashCodeGenerate({
    count: totalQuantity,
    length: 8,
    existing: store.state.tickets.map((ticket) => ticket.code),
    random,
  })
  const ticketCodes = rawCodes.map((raw) => `T-${raw.slice(0, 4)}-${raw.slice(4)}`)
  let codeIndex = 0
  const orderId = dashIdCreate("order")
  const built = dashOrderBuild({
    id: orderId,
    number,
    org: { id: org.id, fee: org.fee },
    event: { id: event.id },
    ticketTypes: store.state.ticketTypes.filter((candidate) => candidate.eventId === event.id),
    lines: resolved,
    buyer: input.buyer,
    holders: input.holders,
    createdAt: nowIso,
    channel: input.channel,
    method: input.method,
    status: "bezahlt",
    code,
    voucher:
      voucher && foundVoucher
        ? {
            voucher: {
              id: foundVoucher.id,
              code: foundVoucher.code,
              initialCents: foundVoucher.initialCents,
              balanceCents: foundVoucher.balanceCents,
              kind: foundVoucher.kind,
              recipientName: foundVoucher.recipientName,
              recipientEmail: foundVoucher.recipientEmail,
              message: foundVoucher.message,
              validity: foundVoucher.validity,
              expiresAt: foundVoucher.expiresAt,
              status: foundVoucher.status,
              createdAt: foundVoucher.createdAt,
              redemptions: foundVoucher.redemptions,
              orgId: org.id,
            },
            amountCents: voucher.amountCents,
          }
        : null,
    ticketIdCreate: () => dashIdCreate("ticket"),
    ticketCodeCreate: () => ticketCodes[codeIndex++] ?? `T-${dashIdCreate("x").slice(2, 6).toUpperCase()}-0000`,
    invoiceNumber,
  })
  if (!built.success) return createResultError(op, built.errorMessage)
  const { order, tickets } = built.data
  if (input.checkIn)
    for (const ticket of tickets) {
      ticket.checkedInAt = nowIso
      ticket.entrance = input.checkIn.entrance
    }
  const linesSummary = order.lines.map((line) => `${line.quantity} × ${line.name}`).join(", ")
  const checkIn = input.checkIn ?? null
  const updated = store.update(op, (draft) => {
    draft.orders.push(order)
    for (const ticket of tickets) draft.tickets.push(ticket)
    if (code) {
      const target = draft.codes.find((candidate) => candidate.id === (code?.id ?? ""))
      if (!target) throw new Error("Code nicht gefunden.")
      target.usedTickets += codeTicketIncrement
    }
    if (voucher) {
      const target = draft.vouchers.find((candidate) => candidate.id === voucher.voucherId)
      if (!target) throw new Error("Gutschein nicht gefunden.")
      target.balanceCents = Math.max(0, target.balanceCents - voucher.amountCents)
      target.redemptions.push({ orderId, amountCents: voucher.amountCents, at: nowIso })
      if (target.balanceCents === 0) target.status = "eingeloest"
    }
    if (checkIn)
      for (const ticket of tickets)
        draft.scans.push({
          id: dashIdCreate("scan"),
          eventId: event.id,
          at: nowIso,
          entrance: checkIn.entrance,
          device: checkIn.device,
          ticketId: ticket.id,
          code: ticket.code,
          result: "ok",
        })
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "bestellungen",
      action: `Bestellung ${order.number} erstellt`,
      before: null,
      after: `${linesSummary} · ${eventPriceFormat(order.totalCents)}`,
    })
  })
  if (!updated.success) return createResultError(op, "Die Bestellung konnte nicht gespeichert werden.")
  return createResult({ order, tickets })
}
