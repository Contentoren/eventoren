import { expect, test } from "bun:test"
import { contentDateFormat } from "../src/app/content/contentDateFormat.ts"

test("calendar dates render as long German and British dates without shifting the day", () => {
  expect(contentDateFormat("2026-11-06", "de")).toBe("6. November 2026")
  expect(contentDateFormat("2026-11-06", "en")).toBe("6 November 2026")
  expect(contentDateFormat("2027-01-01", "de")).toBe("1. Januar 2027")
})

test("instants are shown on their Europe/Berlin calendar day", () => {
  // 23:30 UTC on 31 March is already 1 April in Berlin (CEST, UTC+2).
  expect(contentDateFormat("2026-03-31T23:30:00Z", "de")).toBe("1. April 2026")
  expect(contentDateFormat("2026-03-31T23:30:00Z", "en")).toBe("1 April 2026")
})

test("unparseable values are returned unchanged", () => {
  expect(contentDateFormat("not-a-date", "de")).toBe("not-a-date")
})
