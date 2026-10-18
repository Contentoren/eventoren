import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashSettlementPayoutInfo } from "./dashSettlementPayoutInfo.ts"

const seedNow = new Date("2026-10-18T18:00:00.000Z")

describe("dashSettlementPayoutInfo", () => {
  test("nutzt die echte Auszahlung, wenn vorhanden", () => {
    const state = dashSeedCreate(seedNow)
    const event = state.events.find((candidate) => candidate.id === "ev-sommernacht")
    const payout = state.payouts.find((candidate) => candidate.eventId === "ev-sommernacht")
    expect(event).toBeDefined()
    expect(payout).toBeDefined()
    const info = dashSettlementPayoutInfo({ event: event!, payout: payout ?? null, payoutCents: 999 })
    expect(info.projected).toBe(false)
    expect(info.status).toBe("ausgezahlt")
    expect(info.amountCents).toBe(payout?.amountCents ?? -1)
    expect(info.reference).toBe(payout?.reference ?? "–")
  })

  test("plant die Auszahlung 3 Tage nach Eventende, wenn keine Auszahlung existiert", () => {
    const state = dashSeedCreate(seedNow)
    const event = state.events.find((candidate) => candidate.id === "ev-jazz-wein")
    expect(event).toBeDefined()
    const info = dashSettlementPayoutInfo({ event: event!, payout: null, payoutCents: 12345 })
    expect(info.projected).toBe(true)
    expect(info.status).toBe("geplant")
    expect(info.amountCents).toBe(12345)
    expect(info.paidAt).toBeNull()
    expect(info.dueAt).toBe(new Date(Date.parse(event!.endsAt) + 3 * 86_400_000).toISOString())
  })
})
