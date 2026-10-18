import * as v from "valibot"
import { describe, expect, test } from "bun:test"

import { dashSettlementCompute } from "../../model/dashSettlementCompute.ts"
import { dashStateSchema } from "../../model/dashStateSchema.ts"
import { dashSeedCreate } from "./dashSeedCreate.ts"

describe("dashSeedRestApply", () => {
  test("voller Seed ist valide, deterministisch und erfüllt B4c", () => {
    const now = new Date("2026-10-18T18:00:00.000Z")
    const started = performance.now()
    const first = dashSeedCreate(now)
    const mid = performance.now()
    const second = dashSeedCreate(now)
    const done = performance.now()

    const parsed = v.safeParse(dashStateSchema, first)
    if (!parsed.success) console.log(JSON.stringify(parsed.issues.slice(0, 5), null, 2))
    expect(parsed.success).toBe(true)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))

    const nowMs = now.getTime()
    const indieScans = first.scans.filter((scan) => scan.eventId === "ev-indie-night")
    const indieTickets = first.tickets.filter((ticket) => ticket.eventId === "ev-indie-night")
    const indieChecked = indieTickets.filter((ticket) => ticket.checkedInAt !== null)
    const indieRejected = indieScans.filter((scan) => scan.result !== "ok")
    expect(indieChecked.length).toBeGreaterThanOrEqual(280)
    expect(indieChecked.length).toBeLessThanOrEqual(340)
    expect(indieRejected.length).toBe(9)
    const indieOk = indieScans.filter((scan) => scan.result === "ok")
    expect(indieOk.length).toBe(indieChecked.length)
    for (const scan of indieScans) expect(Date.parse(scan.at) <= nowMs).toBe(true)
    for (const ticket of indieTickets) {
      if (ticket.checkedInAt !== null) expect(Date.parse(ticket.checkedInAt) <= nowMs).toBe(true)
    }

    const poetry = first.payouts.find((payout) => payout.eventId === "ev-poetry-slam")
    const sommer = first.payouts.find((payout) => payout.eventId === "ev-sommernacht")
    expect(poetry?.status).toBe("bereit")
    expect(sommer?.status).toBe("ausgezahlt")
    const orgById = new Map(first.orgs.map((org) => [org.id, org]))
    const eventById = new Map(first.events.map((event) => [event.id, event]))
    for (const payout of first.payouts) {
      const event = eventById.get(payout.eventId)
      const org = event ? orgById.get(event.orgId) : undefined
      if (!event || !org) continue
      const settlement = dashSettlementCompute({
        event,
        ticketTypes: first.ticketTypes,
        orders: first.orders,
        tickets: first.tickets,
        org,
      })
      expect(payout.amountCents).toBe(settlement.payoutCents)
    }

    const json = JSON.stringify(first)
    console.log(`seed json bytes: ${json.length}`)
    console.log(`seed ms first/second: ${Math.round(mid - started)}/${Math.round(done - mid)}`)
    expect(json.length).toBeLessThan(2 * 1024 * 1024)
    expect(done - started).toBeLessThan(600)
  })
})
