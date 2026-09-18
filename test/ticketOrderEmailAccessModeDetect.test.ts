import { expect, test } from "bun:test"
import { ticketOrderEmailAccessModeDetect } from "../src/ticketing/ticketOrderEmailAccessModeDetect.ts"

test("keeps malformed ticket-access fragments in ticket-access mode, but not a bare hash", () => {
  expect(ticketOrderEmailAccessModeDetect("#ticketAccess=")).toBe(true)
  expect(ticketOrderEmailAccessModeDetect(`#ticketAccess=${"a".repeat(64)}`)).toBe(true)
  expect(ticketOrderEmailAccessModeDetect("#")).toBe(false)
  expect(ticketOrderEmailAccessModeDetect("")).toBe(false)
})
