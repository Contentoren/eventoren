import { afterEach, expect, test } from "bun:test"
import { ticketCheckoutFulfillmentActivationIsEnabled } from "../src/ticketing/convex/ticketCheckoutFulfillmentActivationIsEnabled.ts"

afterEach(() => {
  delete process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST
})

test("keeps fulfillment disabled when the organization allowlist is absent or empty", () => {
  expect(ticketCheckoutFulfillmentActivationIsEnabled("eventoren-test")).toBe(false)
  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = " ,  "
  expect(ticketCheckoutFulfillmentActivationIsEnabled("eventoren-test")).toBe(false)
})

test("enables fulfillment only for an exact organization ID in the comma-separated allowlist", () => {
  process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST = "other-org, eventoren-test"
  expect(ticketCheckoutFulfillmentActivationIsEnabled("eventoren-test")).toBe(true)
  expect(ticketCheckoutFulfillmentActivationIsEnabled("eventoren")).toBe(false)
})
