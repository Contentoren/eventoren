import { describe, expect, it } from "bun:test"
import * as v from "valibot"

import { dashStateSchema } from "../../model/dashStateSchema.ts"
import { dashTicketTypeSales } from "../../model/dashTicketTypeSales.ts"

import { dashSeedCreate } from "./dashSeedCreate.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

function soldByType(state: ReturnType<typeof dashSeedCreate>, ticketTypeId: string): number {
  return state.tickets.filter((ticket) => ticket.ticketTypeId === ticketTypeId).length
}

describe("dashSeedOrdersApply", () => {
  it("erzeugt einen gültigen DashState", () => {
    const state = dashSeedCreate(fixedNow)
    const parsed = v.safeParse(dashStateSchema, state)
    if (!parsed.success) console.log(JSON.stringify(parsed.issues.slice(0, 10), null, 2))
    expect(parsed.success).toBe(true)
  })

  it("ist deterministisch", () => {
    const first = JSON.stringify(dashSeedCreate(fixedNow))
    const second = JSON.stringify(dashSeedCreate(fixedNow))
    expect(second).toBe(first)
  })

  it("hält Kapazitäten und Phasenkontingente ein", () => {
    const state = dashSeedCreate(fixedNow)
    for (const type of state.ticketTypes) {
      if (type.channel !== "online") continue
      const sales = dashTicketTypeSales({ ticketType: type, orders: state.orders, tickets: state.tickets })
      expect(sales.sold).toBeLessThanOrEqual(type.capacity)
      for (const phase of type.phases) {
        if (phase.quota === null) continue
        expect(sales.soldByPhase[phase.id] ?? 0).toBeLessThanOrEqual(phase.quota)
      }
    }
  })

  it("zählt Code-Nutzung korrekt", () => {
    const state = dashSeedCreate(fixedNow)
    for (const code of state.codes) {
      const counted = state.orders
        .filter((order) => order.discount?.code === code.code)
        .reduce((sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity, 0), 0)
      expect(code.usedTickets).toBe(counted)
    }
  })

  it("hält Gutschein-Bilanzen konsistent", () => {
    const state = dashSeedCreate(fixedNow)
    for (const voucher of state.vouchers) {
      const redeemed = voucher.redemptions.reduce((sum, entry) => sum + entry.amountCents, 0)
      expect(voucher.balanceCents).toBe(voucher.initialCents - redeemed)
      expect(voucher.balanceCents).toBeGreaterThanOrEqual(0)
      if (voucher.balanceCents === 0 && voucher.status !== "deaktiviert") expect(voucher.status).toBe("eingeloest")
      for (const entry of voucher.redemptions) {
        const order = state.orders.find((candidate) => candidate.id === entry.orderId)
        expect(order?.voucher?.amountCents).toBe(entry.amountCents)
      }
    }
  })

  it("folgt der Bestellsummen-Regel", () => {
    const state = dashSeedCreate(fixedNow)
    for (const order of state.orders) {
      const subtotal = order.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
      const expected = subtotal - (order.discount?.amountCents ?? 0) + order.serviceFeeCents
      expect(order.totalCents).toBe(expected)
      const paid = expected - (order.voucher?.amountCents ?? 0)
      if (paid === 0) expect(order.payment.method === "gutschein" || order.payment.method === "kostenlos").toBe(true)
    }
  })

  it("enthält Leas drei Bestellungen", () => {
    const state = dashSeedCreate(fixedNow)
    const lea = state.orders.filter((order) => order.buyer.email === "lea.schneider@example.de")
    expect(lea.length).toBe(3)
    const indieAll = lea
      .filter((order) => order.eventId === "ev-indie-night")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const indie = indieAll.find((order) =>
      state.tickets
        .filter((ticket) => ticket.orderId === order.id)
        .map((ticket) => ticket.holderName)
        .includes("Jonas Schneider"),
    )
    expect(indie?.status).toBe("bezahlt")
    expect(indie?.lines.reduce((sum, line) => sum + line.quantity, 0)).toBe(2)
    const indieTickets = state.tickets.filter((ticket) => ticket.orderId === indie?.id)
    const holderNames = indieTickets.map((ticket) => ticket.holderName)
    expect(holderNames).toContain("Jonas Schneider")
    expect(holderNames).toContain("Lea Schneider")
    expect(holderNames.length).toBe(2)
    const jazz = lea.find((order) => order.eventId === "ev-jazz-wein")
    expect(jazz?.status).toBe("bezahlt")
    expect(jazz?.lines.reduce((sum, line) => sum + line.quantity, 0)).toBe(1)
    const sommer = lea.find((order) => order.eventId === "ev-sommernacht")
    expect(sommer?.status).toBe("erstattet")
  })

  it("verkauft Indie Night zwischen 400 und 470 Tickets", () => {
    const state = dashSeedCreate(fixedNow)
    const sold = soldByType(state, "tt-indie-stehplatz")
    expect(sold).toBeGreaterThanOrEqual(400)
    expect(sold).toBeLessThanOrEqual(470)
  })

  it("hält rund 550 bis 1100 Bestellungen (ohne Gästeliste)", () => {
    const state = dashSeedCreate(fixedNow)
    const withoutGuests = state.orders.filter((order) => order.channel !== "gaesteliste")
    expect(withoutGuests.length).toBeGreaterThanOrEqual(550)
    expect(withoutGuests.length).toBeLessThanOrEqual(1100)
  })

  it("hält die JSON-Größe unter 2 MB", () => {
    const state = dashSeedCreate(fixedNow)
    const jsonSize = JSON.stringify(state).length
    expect(jsonSize).toBeLessThan(2 * 1024 * 1024)
  })
})
