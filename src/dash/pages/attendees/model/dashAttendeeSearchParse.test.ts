import { describe, expect, test } from "bun:test"
import { dashAttendeeSearchParse } from "./dashAttendeeSearchParse.ts"

describe("dashAttendeeSearchParse", () => {
  test("parst alle Filter und fällt bei ungültigen Werten auf Defaults zurück", () => {
    expect(dashAttendeeSearchParse({ q: "Anna", ticketart: "tt-1", checkin: "offen", kanal: "gaesteliste" })).toEqual({
      q: "Anna",
      ticketart: "tt-1",
      checkin: "offen",
      kanal: "gaesteliste",
    })
    expect(dashAttendeeSearchParse({})).toEqual({ q: "", ticketart: "", checkin: "alle", kanal: "alle" })
    expect(dashAttendeeSearchParse({ checkin: "kaputt", kanal: 42, ticketart: null })).toEqual({
      q: "",
      ticketart: "",
      checkin: "alle",
      kanal: "alle",
    })
  })
})
