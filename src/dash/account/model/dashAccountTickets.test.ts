import { describe, expect, test } from "bun:test"
import { dashSeedCreate } from "../../store/seed/dashSeedCreate.ts"
import { dashAccountTickets } from "./dashAccountTickets.ts"

const seedNow = new Date("2026-10-18T18:00:00+02:00")

describe("dashAccountTickets", () => {
  test("findet Leas Tickets und trennt kommend/vergangen", () => {
    const state = dashSeedCreate(seedNow)
    const result = dashAccountTickets({
      tickets: state.tickets,
      events: state.events,
      ticketTypes: state.ticketTypes,
      email: "lea.schneider@example.de",
      nowIso: seedNow.toISOString(),
    })
    expect(result.upcoming.length).toBe(2)
    expect(result.upcoming.every((row) => row.ticket.holderEmail === "lea.schneider@example.de")).toBe(true)
    expect(result.upcoming.map((row) => row.ticketTypeName)).toContain("Stehplatz")
    expect(result.past.length).toBe(2)
    expect(result.past.every((row) => row.ticket.status === "storniert")).toBe(true)
  })

  test("matcht die E-Mail case-insensitive", () => {
    const state = dashSeedCreate(seedNow)
    const lower = dashAccountTickets({
      tickets: state.tickets,
      events: state.events,
      ticketTypes: state.ticketTypes,
      email: "lea.schneider@example.de",
      nowIso: seedNow.toISOString(),
    })
    const upper = dashAccountTickets({
      tickets: state.tickets,
      events: state.events,
      ticketTypes: state.ticketTypes,
      email: "Lea.Schneider@Example.DE",
      nowIso: seedNow.toISOString(),
    })
    expect(upper.upcoming.map((row) => row.ticket.id)).toEqual(lower.upcoming.map((row) => row.ticket.id))
    expect(upper.past.map((row) => row.ticket.id)).toEqual(lower.past.map((row) => row.ticket.id))
  })

  test("unbekannte E-Mail liefert leere Listen", () => {
    const state = dashSeedCreate(seedNow)
    const result = dashAccountTickets({
      tickets: state.tickets,
      events: state.events,
      ticketTypes: state.ticketTypes,
      email: "niemand@example.de",
      nowIso: seedNow.toISOString(),
    })
    expect(result.upcoming).toEqual([])
    expect(result.past).toEqual([])
  })
})
