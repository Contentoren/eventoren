import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashFinancePayoutRows } from "./dashFinancePayoutRows.ts"

const seedNow = new Date("2026-10-18T18:00:00.000Z")

describe("dashFinancePayoutRows", () => {
  test("mischt echte Auszahlungen mit projizierten Zeilen, neueste zuerst", () => {
    const state = dashSeedCreate(seedNow)
    const orgEvents = state.events.filter((event) => event.orgId === "org-lindenhof")
    const rows = dashFinancePayoutRows({
      events: orgEvents,
      payouts: state.payouts,
      settlementPayout: () => 12345,
      hasSales: (eventId) => ["ev-sommernacht", "ev-poetry-slam", "ev-jazz-wein"].includes(eventId),
    })
    expect(rows.map((row) => row.eventId)).toEqual(["ev-jazz-wein", "ev-poetry-slam", "ev-sommernacht"])

    const jazz = rows.find((row) => row.eventId === "ev-jazz-wein")
    const jazzEvent = state.events.find((event) => event.id === "ev-jazz-wein")
    expect(jazz?.projected).toBe(true)
    expect(jazz?.status).toBe("geplant")
    expect(jazz?.amountCents).toBe(12345)
    expect(jazz?.reference).toBe("–")
    expect(jazz?.dueAt).toBe(new Date(Date.parse(jazzEvent?.endsAt ?? "") + 3 * 86_400_000).toISOString())

    const poetry = rows.find((row) => row.eventId === "ev-poetry-slam")
    expect(poetry?.projected).toBe(false)
    expect(poetry?.status).toBe("bereit")

    const sommer = rows.find((row) => row.eventId === "ev-sommernacht")
    expect(sommer?.projected).toBe(false)
    expect(sommer?.status).toBe("ausgezahlt")
    expect(sommer?.reference.startsWith("AUS-")).toBe(true)
  })

  test("lässt Events ohne Umsatz weg", () => {
    const state = dashSeedCreate(seedNow)
    const rows = dashFinancePayoutRows({
      events: state.events,
      payouts: state.payouts,
      settlementPayout: () => 0,
      hasSales: () => false,
    })
    expect(rows).toEqual([])
  })
})
