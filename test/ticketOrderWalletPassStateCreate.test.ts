import { expect, test } from "bun:test"
import type { TicketOrderProjection } from "../src/ticketing/TicketOrderProjection.ts"
import { ticketOrderWalletPassStateCreate } from "../src/ticketing/ticketOrderWalletPassStateCreate.ts"

const orderCreate = (
  overrides: Partial<
    Pick<TicketOrderProjection, "bookingReference" | "billingOrderReference" | "paymentStatus" | "status">
  > = {},
) =>
  ({
    id: "order-legacy-id",
    checkoutKey: "checkout-key",
    eventKey: "event-key",
    eventTitle: "Event",
    eventSubtitle: "",
    eventDescription: "",
    eventStartsAt: "2026-10-01T18:00:00.000Z",
    eventEndsAt: "2026-10-01T20:00:00.000Z",
    eventDoorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Venue",
    city: "Berlin",
    address: "Street 1",
    organizer: "Eventoren",
    imageUrl: "",
    imageAlt: "",
    catalogVersion: 1,
    contact: { email: "buyer@example.test", givenName: "Demo", familyName: "Buyer", phone: "" },
    subtotalCents: 1000,
    feeCents: 100,
    totalCents: 1000,
    paymentReference: "payment-ref",
    stripeMode: "test",
    status: "paid",
    paymentStatus: "paid",
    createdAt: "2026-09-15T08:00:00.000Z",
    updatedAt: "2026-09-15T08:00:00.000Z",
    lines: [],
    tickets: [],
    ...overrides,
  }) satisfies TicketOrderProjection

test("labels a newly issued booking reference as Bestellnummer", () => {
  expect(
    ticketOrderWalletPassStateCreate({
      order: () => orderCreate({ bookingReference: "BOOK-001" }),
    }).orderReferenceDisplay(),
  ).toEqual({ label: "Bestellnummer", value: "BOOK-001" })
})

test("labels legacy billing references and internal IDs without calling them booking numbers", () => {
  expect(
    ticketOrderWalletPassStateCreate({
      order: () => orderCreate({ billingOrderReference: "BILL-001" }),
    }).orderReferenceDisplay(),
  ).toEqual({ label: "Zahlungsreferenz", value: "BILL-001" })
  expect(ticketOrderWalletPassStateCreate({ order: () => orderCreate() }).orderReferenceDisplay()).toEqual({
    label: "Interne Bestell-ID",
    value: "order-legacy-id",
  })
})

test("a test-mode order still uses Bestellnummer only for an issued booking reference", () => {
  const testOrder = orderCreate({ bookingReference: "TEST-00001" })

  expect(ticketOrderWalletPassStateCreate({ order: () => testOrder }).orderReferenceDisplay()).toEqual({
    label: "Bestellnummer",
    value: "TEST-00001",
  })
})

test("does not expose a booking reference while unpaid or in inventory-conflict review", () => {
  const pending = orderCreate({ paymentStatus: "pending", status: "checkout_created", bookingReference: "BOOK-001" })
  const conflict = orderCreate({ status: "paid_inventory_conflict", bookingReference: "BOOK-001" })

  expect(ticketOrderWalletPassStateCreate({ order: () => pending }).orderReferenceDisplay()).toBeUndefined()
  expect(ticketOrderWalletPassStateCreate({ order: () => conflict }).orderReferenceDisplay()).toBeUndefined()
})
