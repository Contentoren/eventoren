import { describe, expect, it } from "bun:test"
import * as v from "valibot"
import { eventBookingOpensAtSchema } from "./eventBookingOpensAtSchema.ts"

describe("eventBookingOpensAtSchema", () => {
  it("accepts ISO instants with UTC or a timezone offset", () => {
    for (const value of ["2026-10-13T18:00:00Z", "2026-10-13T18:00:00.000Z", "2026-10-13T20:00:00+02:00"])
      expect(v.safeParse(eventBookingOpensAtSchema, value).success).toBe(true)
  })

  it("rejects malformed, ambiguous and impossible dates", () => {
    for (const value of ["", " ", "invalid", "2026-10-13", "2026-10-13T18:00", "2026-02-30T18:00:00Z"])
      expect(v.safeParse(eventBookingOpensAtSchema, value).success).toBe(false)
  })
})
