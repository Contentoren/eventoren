import { describe, expect, test } from "vitest"
import { ticketOrderEmailAccessTokenParse } from "../src/ticketing/ticketOrderEmailAccessTokenParse.ts"

describe("ticketOrderEmailAccessTokenParse", () => {
  test("accepts the opaque fragment used by a clean browser", () => {
    const result = ticketOrderEmailAccessTokenParse(`#ticketAccess=${"a".repeat(64)}`)
    expect(result).toEqual({ success: true, data: "a".repeat(64) })
  })

  test("rejects malformed and cross-channel fragments", () => {
    expect(ticketOrderEmailAccessTokenParse("#ticketAccess=short").success).toBe(false)
    expect(ticketOrderEmailAccessTokenParse("?ticketAccess=some-token").success).toBe(false)
    expect(ticketOrderEmailAccessTokenParse(`#ticketAccess=${"a".repeat(64)}&orderId=other`).success).toBe(false)
  })
})
