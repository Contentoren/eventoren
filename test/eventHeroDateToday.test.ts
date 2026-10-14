import { expect, setSystemTime, test } from "bun:test"
import { eventHeroDateToday } from "../src/events/eventHeroDateToday.ts"

test("the public date filter's today is the Berlin day in summer and winter", () => {
  try {
    setSystemTime(new Date("2026-06-24T22:30:00Z"))
    expect(eventHeroDateToday()).toBe("2026-06-25")
    setSystemTime(new Date("2026-12-24T23:30:00Z"))
    expect(eventHeroDateToday()).toBe("2026-12-25")
  } finally {
    setSystemTime()
  }
})
