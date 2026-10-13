import { expect, test } from "bun:test"
import { ticketCheckoutCancelUrlCreate } from "../src/ticketing/ticketCheckoutCancelUrlCreate.ts"

test("creates checkout cancel URL pointing to event page when eventKey is provided", () => {
  const result = ticketCheckoutCancelUrlCreate("https://eventoren.example.test/", "abiball-36a4910d")

  expect(result).toEqual({
    success: true,
    data: "https://eventoren.example.test/events/abiball-36a4910d",
  })
})

test("creates checkout cancel URL pointing to warenkorb when eventKey is missing", () => {
  const result = ticketCheckoutCancelUrlCreate("https://eventoren.example.test/")

  expect(result).toEqual({
    success: true,
    data: "https://eventoren.example.test/warenkorb",
  })
})

test("rejects a checkout cancel URL origin that is not an HTTP origin", () => {
  const result = ticketCheckoutCancelUrlCreate("javascript:alert(1)")

  expect(result.success).toBe(false)
})
