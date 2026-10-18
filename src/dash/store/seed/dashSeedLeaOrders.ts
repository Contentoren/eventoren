import { dashOrderBuild } from "../../model/dashOrderBuild.ts"
import type { DashCode } from "../../model/dashCodeSchema.ts"
import type { DashOrder } from "../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../model/dashTicketSchema.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import type { DashVoucher } from "../../model/dashVoucherSchema.ts"

export type DashSeedLeaOrders = {
  orders: DashOrder[]
  tickets: DashTicket[]
}

type DashSeedLeaEvent = {
  eventId: string
  orgId: string
  fee: { percentBps: number; fixedCents: number; payer: "kaeufer" | "veranstalter" }
  types: DashTicketType[]
}

/**
 * Leas drei Bestellungen: Indie Night 2× Stehplatz, Jazz & Wein 1 Ticket,
 * Sommernachtskonzert erstattet.
 */
export function dashSeedLeaOrders(args: {
  indie: DashSeedLeaEvent
  jazz: DashSeedLeaEvent
  sommer: DashSeedLeaEvent
  codes: DashCode[]
  vouchers: DashVoucher[]
  orderNumberTake: () => string
  invoiceNumberTake: (free: boolean) => string | null
  orderIdTake: () => string
  ticketIdTake: () => string
  ticketCodeTake: () => string
}): DashSeedLeaOrders {
  const orders: DashOrder[] = []
  const tickets: DashTicket[] = []
  const createdAt = (iso: string) => iso
  const indieType = args.indie.types.find((type) => type.id === "tt-indie-stehplatz")
  const jazzType = args.jazz.types.find((type) => type.id === "tt-jazz-b")
  const sommerType = args.sommer.types.find((type) => type.id === "tt-sommer-standard")

  if (indieType) {
    const indiePhase = indieType.phases[indieType.phases.length - 1]
    if (indiePhase) {
      const built = dashOrderBuild({
        id: args.orderIdTake(),
        number: args.orderNumberTake(),
        org: { id: args.indie.orgId, fee: args.indie.fee },
        event: { id: args.indie.eventId },
        ticketTypes: args.indie.types,
        lines: [
          {
            ticketTypeId: indieType.id,
            phaseId: indiePhase.id,
            unitPriceCents: indiePhase.priceCents,
            quantity: 2,
          },
        ],
        buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
        holders: [
          { name: "Lea Schneider", email: "lea.schneider@example.de" },
          { name: "Jonas Schneider", email: "jonas.schneider@example.de" },
        ],
        createdAt: createdAt("2026-10-02T18:24:00.000Z"),
        channel: "online",
        method: "karte",
        ticketIdCreate: args.ticketIdTake,
        ticketCodeCreate: args.ticketCodeTake,
        invoiceNumber: args.invoiceNumberTake(false),
      })
      if (built.success) {
        orders.push(built.data.order)
        tickets.push(...built.data.tickets)
      }
    }
  }

  if (jazzType) {
    const jazzPhase = jazzType.phases.find((phase) => phase.name === "Phase 1") ?? jazzType.phases[0]
    if (jazzPhase) {
      const built = dashOrderBuild({
        id: args.orderIdTake(),
        number: args.orderNumberTake(),
        org: { id: args.jazz.orgId, fee: args.jazz.fee },
        event: { id: args.jazz.eventId },
        ticketTypes: args.jazz.types,
        lines: [
          {
            ticketTypeId: jazzType.id,
            phaseId: jazzPhase.id,
            unitPriceCents: jazzPhase.priceCents,
            quantity: 1,
          },
        ],
        buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
        createdAt: createdAt("2026-10-09T11:07:00.000Z"),
        channel: "online",
        method: "paypal",
        ticketIdCreate: args.ticketIdTake,
        ticketCodeCreate: args.ticketCodeTake,
        invoiceNumber: args.invoiceNumberTake(false),
      })
      if (built.success) {
        orders.push(built.data.order)
        tickets.push(...built.data.tickets)
      }
    }
  }

  if (sommerType) {
    const sommerPhase = sommerType.phases[0]
    if (sommerPhase) {
      const built = dashOrderBuild({
        id: args.orderIdTake(),
        number: args.orderNumberTake(),
        org: { id: args.sommer.orgId, fee: args.sommer.fee },
        event: { id: args.sommer.eventId },
        ticketTypes: args.sommer.types,
        lines: [
          {
            ticketTypeId: sommerType.id,
            phaseId: sommerPhase.id,
            unitPriceCents: sommerPhase.priceCents,
            quantity: 2,
          },
        ],
        buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
        createdAt: createdAt("2026-08-20T14:41:00.000Z"),
        channel: "online",
        method: "karte",
        status: "erstattet",
        ticketIdCreate: args.ticketIdTake,
        ticketCodeCreate: args.ticketCodeTake,
        invoiceNumber: args.invoiceNumberTake(false),
      })
      if (built.success) {
        const refundedAt = "2026-08-22T09:15:00.000Z"
        const storniert = built.data.tickets.map((ticket) => ({ ...ticket, status: "storniert" as const }))
        orders.push({
          ...built.data.order,
          status: "erstattet",
          refunds: [
            {
              id: `${built.data.order.id}-refund-1`,
              amountCents: built.data.order.totalCents,
              feeCents: built.data.order.serviceFeeCents,
              reason: "Veranstaltung verpasst – Kulanz",
              at: refundedAt,
              ticketIds: storniert.map((ticket) => ticket.id),
            },
          ],
        })
        tickets.push(...storniert)
      }
    }
  }

  void args.codes
  void args.vouchers
  return { orders, tickets }
}
