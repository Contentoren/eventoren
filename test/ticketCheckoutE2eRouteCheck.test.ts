import { describe, expect, test } from "bun:test"
import { ticketCheckoutE2eRouteCheck } from "../src/ticketing/convex/ticketCheckoutE2eRouteCheck.ts"

describe("ticket checkout E2E route", () => {
  test("a normal production event remains eligible for live checkout", () => {
    expect(ticketCheckoutE2eRouteCheck("concert-123", "https://eventoren.de", "live").success).toBe(true)
  })

  test("a run-marked production event cannot reach Billing in either Stripe mode", () => {
    for (const mode of ["live", "test"] as const) {
      expect(ticketCheckoutE2eRouteCheck("ticket-e2e-abc", "https://eventoren.de", mode).success).toBe(false)
    }
  })

  test("a run-marked development event requires test mode", () => {
    expect(ticketCheckoutE2eRouteCheck("ticket-e2e-abc", "https://eventoren.leonardomora.de", "live").success).toBe(
      false,
    )
    expect(ticketCheckoutE2eRouteCheck("ticket-e2e-abc", "https://eventoren.leonardomora.de", "test").success).toBe(
      true,
    )
  })
})
