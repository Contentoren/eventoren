import { describe, expect, test } from "bun:test"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashOrderListFilter } from "./dashOrderListFilter.ts"

function orderFixture(partial: Partial<DashOrder> & { id: string; number: string }): DashOrder {
  return {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    channel: "online",
    createdAt: "2026-10-10T10:00:00.000Z",
    buyer: { firstName: "Anna", lastName: "Muster", email: "anna@example.de" },
    status: "bezahlt",
    payment: { method: "karte", costCents: 0 },
    lines: [
      { ticketTypeId: "tt-1", phaseId: "ph-1", name: "Standard", unitPriceCents: 2500, quantity: 2, taxRateBps: 1900 },
    ],
    discount: null,
    voucher: null,
    serviceFeeCents: 100,
    totalCents: 5100,
    refunds: [],
    chargeback: null,
    notes: [],
    emails: [],
    invoiceNumber: "R-1",
    ...partial,
  }
}

const seedNow = new Date("2026-10-18T18:00:00+02:00")
const base = { q: "", status: "alle" as const, kanal: "alle" as const, scopeEventId: null, eventId: null }

describe("dashOrderListFilter", () => {
  test("sucht über Nummer, Name und E-Mail", () => {
    const state = dashSeedCreate(seedNow)
    const orders = [
      orderFixture({
        id: "o-1",
        number: "EV-101",
        buyer: { firstName: "Lea", lastName: "Schneider", email: "lea@example.de" },
      }),
      orderFixture({
        id: "o-2",
        number: "EV-102",
        buyer: { firstName: "Jonas", lastName: "Weber", email: "jonas@example.de" },
      }),
    ]
    expect(
      dashOrderListFilter({ ...base, orders, events: state.events, q: "ev-101" }).rows.map((row) => row.order.id),
    ).toEqual(["o-1"])
    expect(
      dashOrderListFilter({ ...base, orders, events: state.events, q: "Jonas" }).rows.map((row) => row.order.id),
    ).toEqual(["o-2"])
    expect(
      dashOrderListFilter({ ...base, orders, events: state.events, q: "lea@example" }).rows.map((row) => row.order.id),
    ).toEqual(["o-1"])
  })

  test("Erstattet-Chip zählt teilerstattet mit", () => {
    const state = dashSeedCreate(seedNow)
    const orders = [
      orderFixture({ id: "o-1", number: "EV-1", status: "bezahlt" }),
      orderFixture({ id: "o-2", number: "EV-2", status: "erstattet" }),
      orderFixture({ id: "o-3", number: "EV-3", status: "teilerstattet" }),
      orderFixture({ id: "o-4", number: "EV-4", status: "offen" }),
    ]
    const result = dashOrderListFilter({ ...base, orders, events: state.events })
    expect(result.counts).toEqual({ alle: 4, bezahlt: 1, offen: 1, storniert: 0, erstattet: 2 })
    expect(
      dashOrderListFilter({ ...base, orders, events: state.events, status: "erstattet" })
        .rows.map((row) => row.order.id)
        .sort(),
    ).toEqual(["o-2", "o-3"])
  })

  test("Kanal, Event-Scope und Org-Event-Filter greifen", () => {
    const state = dashSeedCreate(seedNow)
    const orders = [
      orderFixture({ id: "o-1", number: "EV-1", channel: "abendkasse" }),
      orderFixture({ id: "o-2", number: "EV-2", channel: "gaesteliste", eventId: "ev-sommernacht" }),
      orderFixture({ id: "o-3", number: "EV-3", channel: "online", eventId: "ev-sommernacht" }),
    ]
    expect(
      dashOrderListFilter({ ...base, orders, events: state.events, kanal: "abendkasse" }).rows.map(
        (row) => row.order.id,
      ),
    ).toEqual(["o-1"])
    expect(
      dashOrderListFilter({ ...base, orders, events: state.events, scopeEventId: "ev-sommernacht" })
        .rows.map((row) => row.order.id)
        .sort(),
    ).toEqual(["o-2", "o-3"])
    expect(
      dashOrderListFilter({ ...base, orders, events: state.events, eventId: "ev-indie-night" }).rows.map(
        (row) => row.order.id,
      ),
    ).toEqual(["o-1"])
  })

  test("sortiert neueste zuerst, Seed-Bestellungen enthalten alle Status", () => {
    const state = dashSeedCreate(seedNow)
    const orders = [
      orderFixture({ id: "o-alt", number: "EV-1", createdAt: "2026-10-01T10:00:00.000Z" }),
      orderFixture({ id: "o-neu", number: "EV-2", createdAt: "2026-10-15T10:00:00.000Z", status: "teilerstattet" }),
    ]
    const result = dashOrderListFilter({ ...base, orders, events: state.events })
    expect(result.rows.map((row) => row.order.id)).toEqual(["o-neu", "o-alt"])
    expect(result.rows[0]?.ticketCount).toBe(2)
    const seedResult = dashOrderListFilter({ ...base, orders: state.orders, events: state.events })
    const statuses = new Set(seedResult.rows.map((row) => row.order.status as string))
    for (const expected of ["bezahlt", "offen", "storniert", "erstattet", "teilerstattet"]) {
      expect(statuses.has(expected)).toBe(true)
    }
    expect(seedResult.exportRows.length).toBe(seedResult.rows.length)
    expect(seedResult.exportRows[0]?.length).toBe(11)
  })

  test("Export enthält Gutschein-Code und Gutschein-Betrag", () => {
    const state = dashSeedCreate(seedNow)
    const orders = [
      orderFixture({
        id: "o-1",
        number: "EV-1",
        voucher: { voucherId: "v-1", code: "XMAS-10", amountCents: 1000 },
      }),
      orderFixture({ id: "o-2", number: "EV-2", voucher: null }),
    ]
    const result = dashOrderListFilter({ ...base, orders, events: state.events })
    const byId = new Map(result.exportRows.map((row) => [row[0], row]))
    expect(byId.get("EV-1")?.[7]).toBe("XMAS-10")
    expect(byId.get("EV-1")?.[8]).toBe(10)
    expect(byId.get("EV-2")?.[7]).toBeNull()
    expect(byId.get("EV-2")?.[8]).toBeNull()
  })
})
