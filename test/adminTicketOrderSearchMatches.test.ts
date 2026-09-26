import { expect, test } from "bun:test"
import { adminTicketOrderSearchMatches } from "../src/admin/adminTicketOrderSearchMatches.ts"
import { adminTicketOrderBookingReference } from "../src/admin/adminTicketOrderBookingReference.ts"
import { adminTicketOrdersSearchParse } from "../src/admin/adminTicketOrdersSearchParse.ts"

const order = {
  customerEmail: "Erika@Example.test",
  customerGivenName: "Erika",
  customerFamilyName: "Musterfrau",
  bookingNumber: 1,
  stripeMode: "test" as const,
  paymentStatus: "paid",
}

test("paid orders show their formatted booking reference but unpaid orders do not", () => {
  expect(adminTicketOrderBookingReference(order)).toBe("TEST-00001")
  expect(adminTicketOrderBookingReference({ ...order, bookingReference: "TEST-00042" })).toBe("TEST-00042")
  expect(adminTicketOrderBookingReference({ ...order, stripeMode: "live" })).toBe("00001")
  expect(adminTicketOrderBookingReference({ ...order, paymentStatus: "pending" })).toBeUndefined()
})

test("search matches number with or without test prefix, full email and full customer name", () => {
  for (const term of ["00001", "test-00001", "ERIKA@EXAMPLE.TEST", "ERIKA MUSTERFRAU", "erika muster", "MUSTERFRAU"])
    expect(adminTicketOrderSearchMatches(order, term)).toBe(true)
  expect(adminTicketOrderSearchMatches(order, "00002")).toBe(false)
  expect(adminTicketOrderSearchMatches({ ...order, paymentStatus: "pending" }, "00001")).toBe(false)
})

test("order search URL keeps a validated event and a trimmed query", () => {
  expect(adminTicketOrdersSearchParse({ event: "event-1", q: "  TEST-00001  " })).toEqual({
    event: "event-1",
    q: "TEST-00001",
  })
  expect(adminTicketOrdersSearchParse({ event: 1, q: " ".repeat(101) })).toEqual({ event: undefined, q: undefined })
})
