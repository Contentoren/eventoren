import { describe, expect, it } from "bun:test"
import { eventBookingIsOpen } from "./eventBookingIsOpen.ts"

describe("eventBookingIsOpen", () => {
  const bookingOpensAt = "2026-10-13T18:00:00.000Z"
  const opensAt = Date.parse(bookingOpensAt)

  it("keeps existing events without a scheduled opening bookable", () => {
    expect(eventBookingIsOpen({}, opensAt)).toBe(true)
    expect(eventBookingIsOpen({ bookingOpensAt: "" }, opensAt)).toBe(true)
  })

  it("blocks booking before the scheduled instant", () => {
    expect(eventBookingIsOpen({ bookingOpensAt }, opensAt - 1)).toBe(false)
  })

  it("opens booking exactly at the scheduled instant and afterwards", () => {
    expect(eventBookingIsOpen({ bookingOpensAt }, opensAt)).toBe(true)
    expect(eventBookingIsOpen({ bookingOpensAt }, opensAt + 1)).toBe(true)
  })

  it("compares instants rather than timezone representations", () => {
    expect(eventBookingIsOpen({ bookingOpensAt: "2026-10-13T20:00:00+02:00" }, opensAt)).toBe(true)
  })

  it("fails closed for an invalid configured date", () => {
    expect(eventBookingIsOpen({ bookingOpensAt: "invalid" }, opensAt)).toBe(false)
  })

  it("uses the current time when no explicit clock is supplied", () => {
    expect(eventBookingIsOpen({ bookingOpensAt: "2000-01-01T00:00:00Z" })).toBe(true)
  })
})
