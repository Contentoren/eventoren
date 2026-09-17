import { expect, test } from "bun:test"
import { ticketCheckoutReturnUrlCreate } from "../src/ticketing/ticketCheckoutReturnUrlCreate.ts"

test("creates checkout return URLs from the configured Eventoren origin", () => {
  const result = ticketCheckoutReturnUrlCreate(
    "https://eventoren.example.test/",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijkl",
  )

  expect(result).toEqual({
    success: true,
    data: "https://eventoren.example.test/checkout?checkout=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijkl",
  })
})

test("rejects a checkout return URL origin that is not an HTTP origin", () => {
  const result = ticketCheckoutReturnUrlCreate("javascript:alert(1)", "checkout-key")

  expect(result.success).toBe(false)
})
