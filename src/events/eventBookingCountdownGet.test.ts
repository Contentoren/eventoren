import { describe, expect, it } from "bun:test"
import { eventBookingCountdownGet } from "./eventBookingCountdownGet.ts"

describe("eventBookingCountdownGet", () => {
  const opening = "2026-10-13T18:00:00Z"
  const timestamp = Date.parse(opening)

  it("splits the remaining duration into days, hours, minutes and seconds", () => {
    expect(eventBookingCountdownGet(opening, timestamp - 93784000)).toEqual({
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
    })
  })

  it("keeps a positive second visible until booking actually opens", () => {
    expect(eventBookingCountdownGet(opening, timestamp - 1)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 })
  })

  it("never displays a negative countdown at or after the opening", () => {
    for (const now of [timestamp, timestamp + 10000]) {
      expect(eventBookingCountdownGet(opening, now)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
    }
  })

  it("uses instants consistently across timezone offsets", () => {
    expect(eventBookingCountdownGet("2026-10-13T20:00:00+02:00", timestamp - 1000)).toEqual(
      eventBookingCountdownGet(opening, timestamp - 1000),
    )
  })

  it("does not fabricate a countdown for missing or invalid dates and clocks", () => {
    expect(eventBookingCountdownGet(undefined, timestamp)).toBeUndefined()
    expect(eventBookingCountdownGet("invalid", timestamp)).toBeUndefined()
    expect(eventBookingCountdownGet(opening, Number.NaN)).toBeUndefined()
  })
})
