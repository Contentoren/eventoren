import { describe, expect, test } from "bun:test"
import { eventDateFormat } from "../src/events/eventDateFormat.ts"
import { eventDateFormatLong } from "../src/events/eventDateFormatLong.ts"
import { eventDateParts } from "../src/events/eventDateParts.ts"
import { eventHeroDateTriggerLabel } from "../src/events/eventHeroDateTriggerLabel.ts"
import { eventTimeFormat } from "../src/events/eventTimeFormat.ts"

describe("event dates and times in Europe/Berlin", () => {
  test("uses Berlin summer and winter time, not the server or browser timezone", () => {
    expect(eventTimeFormat("2026-06-24T16:00:00Z")).toBe("18:00 Uhr")
    expect(eventTimeFormat("2026-12-24T16:00:00Z")).toBe("17:00 Uhr")
  })

  test("uses the same Berlin calendar day for dates and times across UTC midnight", () => {
    const instant = "2026-06-24T22:30:00Z"
    expect(eventTimeFormat(instant)).toBe("00:30 Uhr")
    expect(eventDateFormat(instant)).toBe("Do., 25. Juni 2026")
    expect(eventDateFormatLong(instant)).toBe("Do., 25. Juni 2026")
  })

  test("observes the daylight-saving transition without a fixed UTC offset", () => {
    expect(eventTimeFormat("2026-03-29T00:30:00Z")).toBe("01:30 Uhr")
    expect(eventTimeFormat("2026-03-29T01:30:00Z")).toBe("03:30 Uhr")
    expect(eventTimeFormat("2026-10-25T00:30:00Z")).toBe("02:30 Uhr")
    expect(eventTimeFormat("2026-10-25T01:30:00Z")).toBe("02:30 Uhr")
  })

  test("public event-card parts and date labels use the same Berlin day", () => {
    expect(eventDateParts("2026-06-24T22:30:00Z")).toEqual({
      day: "25",
      month: "Jun",
      weekday: "Do",
      year: "2026",
    })
    expect(eventHeroDateTriggerLabel("2026-06-24T22:30:00Z")).toBe("Do., 25. Juni")
    expect(eventHeroDateTriggerLabel("2026-06-25")).toBe("Do., 25. Juni")
    expect(eventHeroDateTriggerLabel("invalid")).toBe("Datum wählen")
  })

  test("public event-card year changes at Berlin midnight, not UTC midnight", () => {
    expect(eventDateParts("2026-12-31T23:30:00Z")).toEqual({
      day: "01",
      month: "Jan",
      weekday: "Fr",
      year: "2027",
    })
  })
})
