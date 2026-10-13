import { expect, mock, test } from "bun:test"
import type { TicketOrderProjection } from "../src/ticketing/TicketOrderProjection.ts"
import type { TicketOrderStatusPageState } from "../src/ticketing/TicketOrderStatusPageState.ts"
import { createSignalObject } from "../ui/utils/createSignalObject.ts"

mock.module("../src/ticketing/ticketOrderStatusPageStateCreate.ts", () => ({
  ticketOrderStatusPageStateCreate: () => {
    throw new Error("The supplied-state regression must not create fallback state")
  },
}))

const { ticketOrderStatusPageViewStateCreate } = await import(
  "../src/ticketing/ticketOrderStatusPageViewStateCreate.ts"
)

const orderCreate = (paymentStatus: TicketOrderProjection["paymentStatus"], status: TicketOrderProjection["status"]) =>
  ({
    id: `demo-order-${paymentStatus}`,
    checkoutKey: "demo-checkout",
    eventKey: "demo-event",
    eventTitle: "Demo event",
    eventSubtitle: "",
    eventDescription: "",
    eventStartsAt: "2026-10-01T18:00:00.000Z",
    eventEndsAt: "2026-10-01T20:00:00.000Z",
    eventDoorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Demo venue",
    city: "Berlin",
    address: "Demo street 1",
    organizer: "Eventoren",
    imageUrl: "",
    imageAlt: "",
    catalogVersion: 1,
    contact: { email: "demo@example.test", givenName: "Demo", familyName: "User", phone: "" },
    subtotalCents: 1000,
    feeCents: 100,
    totalCents: 1100,
    paymentReference: "demo-payment",
    stripeMode: "test",
    status,
    paymentStatus,
    createdAt: "2026-09-15T08:00:00.000Z",
    updatedAt: "2026-09-15T08:00:00.000Z",
    lines: [],
    tickets: [],
  }) satisfies TicketOrderProjection

test("decorates a supplied demo order state with reactive confirmation methods", () => {
  const paidOrder = orderCreate("paid", "paid")
  const paidOrderWithReference = { ...paidOrder, bookingReference: "BOOK-2026-001" }
  const pendingOrder = orderCreate("pending", "checkout_created")
  const orders = createSignalObject<readonly TicketOrderProjection[]>([paidOrderWithReference])
  const suppliedState: TicketOrderStatusPageState = {
    orders: orders.get,
    isLoading: () => false,
    isRefreshing: () => false,
    errorMessage: () => "",
    refresh: async () => {},
    goToEvents: async () => {},
  }
  const state = ticketOrderStatusPageViewStateCreate({
    orderIds: () => [],
    checkoutKey: () => undefined,
    state: () => suppliedState,
  })

  expect(state.isPaid()).toBe(true)
  expect(state.confirmationSymbol()).toBe("✓")
  expect(state.confirmationTitle()).toBe("Vielen Dank – dein Kauf war erfolgreich!")
  expect(state.paidOrderReferences()).toEqual([{ label: "Bestellnummer", value: "BOOK-2026-001" }])

  orders.set([pendingOrder])

  expect(state.isPaid()).toBe(false)
  expect(state.confirmationSymbol()).toBe("…")
  expect(state.confirmationTitle()).toBe("Deine Bestellung ist eingegangen")
  expect(state.paidOrderReferences()).toEqual([])
})

test("labels paid legacy references and internal IDs accurately", () => {
  const paidOrder = orderCreate("paid", "paid")
  const legacyOrder = { ...paidOrder, billingOrderReference: "BILL-LEGACY" }
  const state = ticketOrderStatusPageViewStateCreate({
    orderIds: () => [],
    checkoutKey: () => undefined,
    state: () => ({
      orders: () => [legacyOrder, paidOrder],
      isLoading: () => false,
      isRefreshing: () => false,
      errorMessage: () => "",
      refresh: async () => {},
      goToEvents: async () => {},
    }),
  })

  expect(state.paidOrderReferences()).toEqual([
    { label: "Zahlungsreferenz", value: "BILL-LEGACY" },
    { label: "Interne Bestell-ID", value: paidOrder.id },
  ])
})

test("distinguishes valid early-issued SEPA tickets from standard pending", () => {
  const sepaIssuedOrder: TicketOrderProjection = {
    ...orderCreate("pending", "checkout_created"),
    bookingReference: "BOOK-SEPA-001",
    ticketsIssuedAt: "2026-10-12T10:00:00.000Z",
    paymentMethodType: "sepa_debit",
    tickets: [
      {
        id: "t-1",
        sequence: 1,
        code: "CODE-1",
        eventKey: "demo-event",
        eventTitle: "Demo event",
        eventStartsAt: "2026-10-01T18:00:00.000Z",
        eventDoorsAt: "2026-10-01T17:00:00.000Z",
        venue: "Demo venue",
        city: "Berlin",
        address: "Demo street 1",
        tierKey: "tier-1",
        tierName: "Standard",
        priceCents: 1000,
        feeCents: 100,
        cancelled: false,
        issuedAt: "2026-10-12T10:00:00.000Z",
      },
    ],
  }
  const state = ticketOrderStatusPageViewStateCreate({
    orderIds: () => [],
    checkoutKey: () => undefined,
    state: () => ({
      orders: () => [sepaIssuedOrder],
      isLoading: () => false,
      isRefreshing: () => false,
      errorMessage: () => "",
      refresh: async () => {},
      goToEvents: async () => {},
    }),
  })

  expect(state.isPaid()).toBe(false)
  expect(state.isIssuedPending()).toBe(true)
  expect(state.hasFailedOrder()).toBe(false)
  expect(state.confirmationSymbol()).toBe("✓")
  expect(state.confirmationTitle()).toBe("Deine Tickets sind bereit – Zahlung in Bearbeitung")
  expect(state.confirmationMessage()).toContain("SEPA-Lastschrift wird verarbeitet")
  expect(state.paidOrderReferences()).toEqual([{ label: "Bestellnummer", value: "BOOK-SEPA-001" }])
})

test("distinguishes cancelled orders and marks them as clearly invalid", () => {
  const cancelledOrder: TicketOrderProjection = {
    ...orderCreate("failed", "failed"),
    cancellation: {
      cancelledAt: "2026-10-12T11:00:00.000Z",
      organizationId: "org-1",
      eventKey: "demo-event",
      orderReference: "ord-ref",
      paymentReference: "demo-payment",
      stripeMode: "test",
      paymentMethodType: "sepa_debit",
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      stripePaymentIntentId: "pi_1",
      reason: "payment_failed",
      stripeEventType: "checkout.session.async_payment_failed",
      stripeChargeId: null,
      stripeDisputeId: null,
    },
  }
  const state = ticketOrderStatusPageViewStateCreate({
    orderIds: () => [],
    checkoutKey: () => undefined,
    state: () => ({
      orders: () => [cancelledOrder],
      isLoading: () => false,
      isRefreshing: () => false,
      errorMessage: () => "",
      refresh: async () => {},
      goToEvents: async () => {},
    }),
  })

  expect(state.isPaid()).toBe(false)
  expect(state.hasCancelledOrder()).toBe(true)
  expect(state.hasFailedOrder()).toBe(true)
  expect(state.confirmationSymbol()).toBe("!")
  expect(state.confirmationTitle()).toBe("Deine Bestellung wurde storniert")
  expect(state.confirmationMessage()).toContain("storniert")
})
