import { describe, expect, test } from "bun:test"
import { organizerDashboardBerlinDayOf, organizerDashboardBerlinDayRangeCreate } from "./organizerDashboardBerlinDay.ts"
import { organizerDashboardFinanceCsvCreate } from "./organizerDashboardFinanceCsvCreate.ts"
import { organizerDashboardFinanceTotalsCreate } from "./organizerDashboardFinanceTotalsCreate.ts"

describe("organizerDashboardBerlinDay", () => {
  test("maps instants to the Berlin calendar day across midnight and DST", () => {
    // 00:30 Berlin (CEST, UTC+2) is still the previous day in UTC.
    expect(organizerDashboardBerlinDayOf("2026-07-01T22:30:00.000Z")).toBe("2026-07-02")
    expect(organizerDashboardBerlinDayOf("2026-01-15T22:59:00.000Z")).toBe("2026-01-15")
    expect(organizerDashboardBerlinDayOf("2026-01-15T23:00:00.000Z")).toBe("2026-01-16")
    expect(organizerDashboardBerlinDayOf("kein-datum")).toBeUndefined()
  })

  test("lists inclusive day ranges and rejects bad input", () => {
    expect(organizerDashboardBerlinDayRangeCreate("2026-03-28", "2026-03-30")).toEqual({
      success: true,
      days: ["2026-03-28", "2026-03-29", "2026-03-30"],
    })
    expect(organizerDashboardBerlinDayRangeCreate("2026-03-30", "2026-03-28").success).toBe(false)
    expect(organizerDashboardBerlinDayRangeCreate("28.03.2026", "2026-03-30").success).toBe(false)
  })
})

describe("organizerDashboardFinanceTotalsCreate", () => {
  test("sums integer cents and subtracts disputes from the payout", () => {
    expect(
      organizerDashboardFinanceTotalsCreate([
        { subtotalCents: 2000, feeCents: 100, totalCents: 2100, disputed: false },
        { subtotalCents: 1500, feeCents: 75, totalCents: 1575, disputed: true },
      ]),
    ).toEqual({ paidOrders: 2, grossCents: 3500, feeCents: 175, disputeCents: 1575, payoutCents: 1750 })
  })

  test("empty input yields zeros", () => {
    expect(organizerDashboardFinanceTotalsCreate([])).toEqual({
      paidOrders: 0,
      grossCents: 0,
      feeCents: 0,
      disputeCents: 0,
      payoutCents: 0,
    })
  })
})

describe("organizerDashboardFinanceCsvCreate", () => {
  test("renders semicolon CSV with quoted special cells", () => {
    const csv = organizerDashboardFinanceCsvCreate([
      {
        eventKey: "sommerfest",
        eventTitle: 'Sommerfest "Open Air"; Bühne',
        paidOrders: 3,
        tickets: 5,
        grossCents: 10000,
        feeCents: 500,
        disputeCents: 0,
        payoutCents: 9500,
      },
    ])
    expect(csv).toBe(
      "Event-Key;Titel;Bestellungen;Tickets;Brutto (€);Gebühren (€);Streitfälle (€);Auszahlung (€)\r\n" +
        'sommerfest;"Sommerfest ""Open Air""; Bühne";3;5;100.00;5.00;0.00;95.00\r\n',
    )
  })
})
