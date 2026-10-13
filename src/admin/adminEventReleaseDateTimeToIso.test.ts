import { describe, expect, test } from "bun:test"
import { adminEventReleaseDateTimeFromIso } from "./adminEventReleaseDateTimeFromIso.ts"
import { adminEventReleaseDateTimeToIso } from "./adminEventReleaseDateTimeToIso.ts"

describe("German booking release times", () => {
  test("tomorrow at 18:30 Berlin time is saved as 16:30 UTC", () => {
    expect(adminEventReleaseDateTimeToIso("2026-10-14T18:30")).toEqual({
      success: true,
      data: "2026-10-14T16:30:00.000Z",
    })
  })

  test("winter times use Berlin's standard time", () => {
    expect(adminEventReleaseDateTimeToIso("2026-12-14T18:30")).toEqual({
      success: true,
      data: "2026-12-14T17:30:00.000Z",
    })
  })

  test("stored times display in Berlin regardless of the browser timezone", () => {
    expect(adminEventReleaseDateTimeFromIso("2026-10-14T16:30:00.000Z")).toBe("2026-10-14T18:30")
    expect(adminEventReleaseDateTimeFromIso("2026-10-14T22:00:00.000Z")).toBe("2026-10-15T00:00")
  })

  test("clearing the date removes the scheduled release", () => {
    expect(adminEventReleaseDateTimeToIso("")).toEqual({ success: true, data: "" })
    expect(adminEventReleaseDateTimeFromIso("")).toBe("")
  })

  test("invalid dates and nonexistent summer-time hours cannot be saved", () => {
    for (const value of ["invalid", "2026-02-30T18:30", "2026-10-14T25:30", "2026-03-29T02:30"]) {
      expect(adminEventReleaseDateTimeToIso(value).success).toBe(false)
    }
  })
})
