import { dashOrderBuild } from "../../model/dashOrderBuild.ts"
import { dashRandomCreate } from "../../model/dashRandomCreate.ts"
import type { DashBoxOfficeSale } from "../../model/dashBoxOfficeSaleSchema.ts"
import type { DashOrder } from "../../model/dashOrderSchema.ts"
import type { DashScan } from "../../model/dashScanSchema.ts"
import type { DashState } from "../../model/dashStateSchema.ts"
import type { DashTicket } from "../../model/dashTicketSchema.ts"

import { dashSeedFirstNames, dashSeedLastNames } from "./dashSeedNames.ts"
import { dashSeedTicketCodeCreate } from "./dashSeedTicketCodeCreate.ts"

const seedConstant = 20261021

/**
 * Seedet Abendkassen-Verkäufe für die Indie Night mit Bestellungen und Einlass.
 * Deterministisch über `dashRandomCreate` mit fester Konstante.
 */
export function dashSeedBoxOfficeApply(state: DashState, now: Date): DashState {
  const random = dashRandomCreate(seedConstant)
  const firstNames = dashSeedFirstNames()
  const lastNames = dashSeedLastNames()
  const nowMs = now.getTime()

  const tickets: DashTicket[] = state.tickets.map((ticket) => ({ ...ticket }))
  const orders: DashOrder[] = [...state.orders]
  const scans: DashScan[] = [...state.scans]
  const boxOfficeSales: DashBoxOfficeSale[] = [...state.boxOfficeSales]

  const taken = new Set(tickets.map((ticket) => ticket.code))
  const ticketCodeTake = () => dashSeedTicketCodeCreate(random, taken)

  let orderSeq = 6000
  let ticketSeq = 60000
  let saleSeq = boxOfficeSales.length
  let scanSeq = scans.length
  let orderNumberSeq = 279000
  const orderIdTake = () => {
    orderSeq += 1
    return `order-ak-${String(orderSeq).padStart(4, "0")}`
  }
  const ticketIdTake = () => {
    ticketSeq += 1
    return `ticket-ak-${String(ticketSeq).padStart(5, "0")}`
  }
  const saleIdTake = () => {
    saleSeq += 1
    return `ak-sale-${String(saleSeq).padStart(3, "0")}`
  }
  const scanIdTake = () => {
    scanSeq += 1
    return `scan-ak-${String(scanSeq).padStart(5, "0")}`
  }

  const indieTypes = state.ticketTypes.filter((type) => type.eventId === "ev-indie-night")
  const akType = indieTypes.find((type) => type.id === "tt-indie-abendkasse")
  const akPhase = akType?.phases[0]
  const indieEvent = state.events.find((event) => event.id === "ev-indie-night")
  if (!akType || !akPhase || !indieEvent) return { ...state, tickets, orders, scans, boxOfficeSales }

  const org = state.orgs.find((item) => item.id === indieEvent.orgId)
  if (!org) return { ...state, tickets, orders, scans, boxOfficeSales }

  const methods = ["applepay", "googlepay", "karte"] as const

  for (let index = 0; index < 12; index += 1) {
    const quantityRoll = random()
    const quantity = quantityRoll < 0.5 ? 1 : quantityRoll < 0.85 ? 2 : 3
    const saleAtMs = nowMs - Math.floor(random() * 60 * 60_000)
    const saleAt = new Date(saleAtMs).toISOString()
    const firstName = firstNames[Math.floor(random() * firstNames.length)] ?? "Alex"
    const lastName = lastNames[Math.floor(random() * lastNames.length)] ?? "Mustermann"
    const buyer = { firstName, lastName, email: "" }
    const orderId = orderIdTake()
    const built = dashOrderBuild({
      id: orderId,
      number: `EV-${279001 + index}`,
      org: { id: indieEvent.orgId, fee: org.fee },
      event: { id: indieEvent.id },
      ticketTypes: indieTypes,
      lines: [{ ticketTypeId: akType.id, phaseId: akPhase.id, unitPriceCents: akPhase.priceCents, quantity }],
      buyer,
      createdAt: saleAt,
      channel: "abendkasse",
      method: methods[Math.floor(random() * methods.length)] ?? "karte",
      ticketIdCreate: ticketIdTake,
      ticketCodeCreate: ticketCodeTake,
      invoiceNumber: "",
    })
    if (!built.success) continue
    orderNumberSeq += 1
    void orderNumberSeq
    orders.push(built.data.order)
    for (const ticket of built.data.tickets) {
      const checked = { ...ticket, checkedInAt: saleAt, entrance: "Abendkasse" as const }
      tickets.push(checked)
      scans.push({
        id: scanIdTake(),
        eventId: "ev-indie-night",
        at: saleAt,
        entrance: "Abendkasse",
        device: "Abendkasse",
        ticketId: checked.id,
        code: checked.code,
        result: "ok",
      })
    }
    boxOfficeSales.push({
      id: saleIdTake(),
      eventId: "ev-indie-night",
      lines: [{ ticketTypeId: akType.id, quantity, unitPriceCents: akPhase.priceCents }],
      totalCents: akPhase.priceCents * quantity,
      status: "bezahlt",
      createdAt: saleAt,
      paidAt: saleAt,
      orderId,
      buyerEmail: null,
    })
  }

  const abortedAt = new Date(nowMs - Math.floor(random() * 60 * 60_000)).toISOString()
  boxOfficeSales.push({
    id: saleIdTake(),
    eventId: "ev-indie-night",
    lines: [{ ticketTypeId: akType.id, quantity: 2, unitPriceCents: akPhase.priceCents }],
    totalCents: akPhase.priceCents * 2,
    status: "abgebrochen",
    createdAt: abortedAt,
    paidAt: null,
    orderId: null,
    buyerEmail: null,
  })

  return { ...state, tickets, orders, scans, boxOfficeSales }
}
