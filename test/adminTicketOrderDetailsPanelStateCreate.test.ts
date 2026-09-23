import { expect, test } from "bun:test"
import type { AdminTicketOrderDetails } from "../src/admin/AdminTicketOrderDetails.ts"
import { adminTicketOrderDetailsPanelStateCreate } from "../src/admin/adminTicketOrderDetailsPanelStateCreate.ts"

test("missing charge, session address, and partial card data render without invented digits", () => {
  let order = {
    stripeDetails: {
      session: {
        customerDetails: {
          name: null,
          email: null,
          phone: null,
          address: { line1: "Street 1", line2: null, city: null, state: null, postalCode: null, country: null },
        },
        amountTotalCents: 0,
        currency: "eur",
        status: null,
        paymentStatus: "unpaid",
      },
      charge: null,
    },
  } as unknown as AdminTicketOrderDetails
  const state = adminTicketOrderDetailsPanelStateCreate({ order: () => order })
  expect(state.address()?.line1).toBe("Street 1")
  expect(state.cardLabel()).toBe("Keine Kartendaten verfügbar")
  order = {
    ...order,
    stripeDetails: {
      ...order.stripeDetails!,
      charge: {
        billingDetails: { name: null, email: null, phone: null, address: null },
        paymentMethod: { type: "card", card: { brand: "visa", last4: null, expMonth: null, expYear: null } },
        amountCents: 0,
        currency: "eur",
        status: "succeeded",
        receiptUrl: null,
      },
    },
  }
  expect(state.cardLabel()).toBe("visa")
})
