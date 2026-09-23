import { expect, test } from "bun:test"
import { adminTicketOrderDetailsMap } from "../src/admin/adminTicketOrderDetailsMap.ts"

const local = {
  id: "order-1",
  customerEmail: "buyer@example.test",
  customerGivenName: "Ada",
  customerFamilyName: "Lovelace",
  customerAddress: "Main Street 1, Berlin",
  customerPhone: "+491234567",
  eventKey: "event-1",
  eventTitle: "Konzert",
  eventSubtitle: "Abendshow",
  eventStartsAt: "2026-10-01T18:00:00.000Z",
  eventEndsAt: "2026-10-01T20:00:00.000Z",
  eventDoorsAt: "2026-10-01T17:00:00.000Z",
  venue: "Halle",
  city: "Berlin",
  eventAddress: "Venue Road 2",
  organizer: "Eventoren",
  subtotalCents: 1000,
  feeCents: 100,
  totalCents: 1100,
  paymentReference: "payment-ref",
  billingOrderReference: "billing-order",
  stripeMode: "test" as const,
  orderStatus: "paid",
  paymentStatus: "paid",
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
  lines: [{ tierName: "Standard", quantity: 1, priceCents: 1000, feeCents: 100 }],
}

test("keeps local order data visible when Stripe data is missing or failed", () => {
  expect(adminTicketOrderDetailsMap(local, null)).toMatchObject({
    customerAddress: "Main Street 1, Berlin",
    paymentReference: "payment-ref",
    stripeDetails: null,
    stripeError: null,
  })
  expect(adminTicketOrderDetailsMap(local, { success: false, errorMessage: "temporary failure" })).toMatchObject({
    customerEmail: "buyer@example.test",
    stripeDetails: null,
    stripeError: "temporary failure",
  })
})

test("maps packaged Stripe details alongside independent local order data", () => {
  const stripeDetails = {
    paymentReference: "payment-ref",
    orderReference: "billing-order",
    stripeMode: "test" as const,
    session: null,
    charge: {
      billingDetails: { name: "Ada Lovelace", email: "stripe@example.test", phone: null, address: null },
      paymentMethod: { type: "card", card: { brand: "visa", last4: "4242", expMonth: 8, expYear: 2030 } },
      amountCents: 1100,
      currency: "eur",
      status: "succeeded",
      receiptUrl: "https://stripe.test/receipt",
    },
  }
  expect(adminTicketOrderDetailsMap(local, { success: true, data: stripeDetails })).toMatchObject({
    customerEmail: "buyer@example.test",
    stripeDetails: { charge: { paymentMethod: { card: { last4: "4242" } } } },
  })
})
