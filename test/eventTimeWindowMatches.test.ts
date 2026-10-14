import { expect, test } from "bun:test"
import { eventTimeWindowMatches } from "../src/events/eventTimeWindowMatches.ts"

test("today and this month use Berlin's calendar boundary without changing instants", () => {
  const now = new Date("2026-06-30T22:15:00Z")
  expect(eventTimeWindowMatches("2026-06-30T22:30:00Z", "heute", now)).toBe(true)
  expect(eventTimeWindowMatches("2026-06-30T21:30:00Z", "heute", now)).toBe(false)
  expect(eventTimeWindowMatches("2026-07-31T21:30:00Z", "monat", now)).toBe(true)
  expect(eventTimeWindowMatches("2026-07-31T22:30:00Z", "monat", now)).toBe(false)
  expect(eventTimeWindowMatches("2026-06-30T22:00:00Z", "monat", now)).toBe(false)
})

test("weekend includes Saturday and Sunday Berlin time through the DST transition", () => {
  const now = new Date("2026-03-27T12:00:00Z")
  expect(eventTimeWindowMatches("2026-03-27T23:00:00Z", "wochenende", now)).toBe(true)
  expect(eventTimeWindowMatches("2026-03-29T21:59:00Z", "wochenende", now)).toBe(true)
  expect(eventTimeWindowMatches("2026-03-27T22:59:00Z", "wochenende", now)).toBe(false)
  expect(eventTimeWindowMatches("2026-03-29T22:00:00Z", "wochenende", now)).toBe(false)
})
