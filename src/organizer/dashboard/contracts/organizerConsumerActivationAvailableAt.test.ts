import { expect, test } from "bun:test"
import { organizerConsumerActivationAvailableAt } from "./organizerConsumerActivationAvailableAt.ts"

test.each([
  // Acceptance day is excluded; all of the 14th day is protected.
  ["2026-02-03T11:00:00Z", "2026-02-17T23:00:00.000Z"],
  // Spring DST, Saturday deadline extended through Monday (Berlin +02).
  ["2026-03-14T11:00:00Z", "2026-03-30T22:00:00.000Z"],
  // Autumn DST, Sunday deadline extended through Monday (Berlin +01).
  ["2026-10-11T10:00:00Z", "2026-10-26T23:00:00.000Z"],
  // Friday Good Friday -> Easter Monday -> Tuesday end.
  ["2026-03-20T11:00:00Z", "2026-04-07T22:00:00.000Z"],
  ["2026-05-21T10:00:00Z", "2026-06-05T22:00:00.000Z"], // Corpus Christi NRW
  ["2026-04-17T10:00:00Z", "2026-05-04T22:00:00.000Z"], // May 1 + weekend
  ["2026-12-11T11:00:00Z", "2026-12-28T23:00:00.000Z"], // Christmas + weekend
  ["2026-02-02T23:30:00Z", "2026-02-17T23:00:00.000Z"], // Berlin date, not UTC date
])("consumer withdrawal calendar %s ends at %s", (accepted, expected) => {
  expect(new Date(organizerConsumerActivationAvailableAt(accepted)).toISOString()).toBe(expected)
})

test("invalid consent instant fails closed", () => {
  expect(organizerConsumerActivationAvailableAt("not-a-date")).toBe(Number.POSITIVE_INFINITY)
})
