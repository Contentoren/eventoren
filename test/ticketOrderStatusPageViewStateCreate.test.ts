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
  const pendingOrder = orderCreate("pending", "checkout_created")
  const orders = createSignalObject<readonly TicketOrderProjection[]>([paidOrder])
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
  expect(state.confirmationClass()).toBe("border-success/50 bg-success-soft")

  orders.set([pendingOrder])

  expect(state.isPaid()).toBe(false)
  expect(state.confirmationSymbol()).toBe("…")
  expect(state.confirmationTitle()).toBe("Deine Bestellung ist eingegangen")
})
