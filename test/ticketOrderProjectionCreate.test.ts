import { expect, test } from "bun:test"
import type { QueryCtx } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { ticketOrderProjectionCreate } from "../src/ticketing/convex/ticketOrderProjectionCreate.ts"

test("ticketOrderProjectionCreate projects issued valid pending tickets awaiting SEPA settlement", async () => {
  const orderId = "order_sepa_1" as Id<"ticketOrders">
  const mockOrder = {
    _id: orderId,
    checkoutKey: "chk_1",
    eventKey: "evt_1",
    eventTitle: "SEPA Concert",
    eventSubtitle: "Live",
    eventDescription: "Description",
    eventStartsAt: "2026-11-01T20:00:00.000Z",
    eventEndsAt: "2026-11-01T23:00:00.000Z",
    eventDoorsAt: "2026-11-01T19:00:00.000Z",
    venue: "Main Hall",
    city: "Munich",
    address: "Street 5",
    organizer: "Eventoren",
    imageUrl: "https://example.test/img.png",
    imageAlt: "Alt",
    catalogVersion: 1,
    customerEmail: "buyer@example.test",
    customerGivenName: "Hans",
    customerFamilyName: "Muster",
    customerPhone: "+49123456",
    subtotalCents: 5000,
    feeCents: 250,
    totalCents: 5250,
    paymentReference: "pay_ref_1",
    billingOrderReference: "bill_ord_1",
    bookingNumber: 101,
    bookingReference: "TEST-00101",
    stripeMode: "test" as const,
    status: "checkout_created" as const,
    paymentStatus: "pending" as const,
    checkoutUrl: "https://checkout.stripe.test/c/pay/1",
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:05:00.000Z",
    ticketsIssuedAt: "2026-10-12T10:05:00.000Z",
    paymentMethodType: "sepa_debit",
    checkoutCompletedAt: "2026-10-12T10:05:00.000Z",
    stripePaymentIntentStatus: "processing" as const,
  }

  const mockLines = [
    {
      _id: "line_1" as Id<"ticketOrderLines">,
      orderId,
      tierId: "tier_1" as Id<"catalogTicketTiers">,
      tierKey: "tier_standard",
      tierName: "Standard",
      tierDescription: "Desc",
      quantity: 1,
      priceCents: 5000,
      feeCents: 250,
    },
  ]

  const mockTickets = [
    {
      _id: "ticket_1" as Id<"ticketIssued">,
      orderId,
      sequence: 1,
      code: "TICK-001",
      eventKey: "evt_1",
      eventTitle: "SEPA Concert",
      eventStartsAt: "2026-11-01T20:00:00.000Z",
      eventDoorsAt: "2026-11-01T19:00:00.000Z",
      venue: "Main Hall",
      city: "Munich",
      address: "Street 5",
      tierKey: "tier_standard",
      tierName: "Standard",
      priceCents: 5000,
      feeCents: 250,
      participantName: "Hans Muster",
      issuedAt: "2026-10-12T10:05:00.000Z",
    },
  ]

  const ctx = {
    db: {
      get: async (table: string, id: string) => (table === "ticketOrders" && id === orderId ? mockOrder : null),
      query: (table: string) => ({
        withIndex: (_index: string, _filter: unknown) => ({
          collect: async () => (table === "ticketOrderLines" ? mockLines : table === "ticketIssued" ? mockTickets : []),
        }),
      }),
    },
  } as unknown as QueryCtx

  const result = await ticketOrderProjectionCreate(ctx, orderId)
  expect(result).not.toBeNull()
  expect(result!.success).toBe(true)
  if (!result?.success) return

  const projection = result.data
  expect(projection.paymentStatus).toBe("pending")
  expect(projection.ticketsIssuedAt).toBe("2026-10-12T10:05:00.000Z")
  expect(projection.paymentMethodType).toBe("sepa_debit")
  expect(projection.checkoutCompletedAt).toBe("2026-10-12T10:05:00.000Z")
  expect(projection.stripePaymentIntentStatus).toBe("processing")
  expect(projection.cancellation).toBeUndefined()
  expect(projection.tickets.length).toBe(1)
  expect(projection.tickets[0]?.cancelled).toBe(false)
  expect(projection.tickets[0]?.code).toBe("TICK-001")
})

test("ticketOrderProjectionCreate projects cancelled evidence and flags tickets cancelled", async () => {
  const orderId = "order_sepa_cancelled" as Id<"ticketOrders">
  const cancellationData = {
    cancelledAt: "2026-10-12T14:00:00.000Z",
    organizationId: "org_1",
    eventKey: "evt_1",
    orderReference: "bill_ord_1",
    paymentReference: "pay_ref_1",
    stripeMode: "test" as const,
    paymentMethodType: "sepa_debit" as const,
    stripeEventId: "evt_fail_1",
    stripeSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    reason: "payment_failed" as const,
    stripeEventType: "checkout.session.async_payment_failed" as const,
    stripeChargeId: null,
    stripeDisputeId: null,
  }

  const mockOrder = {
    _id: orderId,
    checkoutKey: "chk_1",
    eventKey: "evt_1",
    eventTitle: "SEPA Concert",
    eventSubtitle: "",
    eventDescription: "",
    eventStartsAt: "2026-11-01T20:00:00.000Z",
    eventEndsAt: "2026-11-01T23:00:00.000Z",
    eventDoorsAt: "2026-11-01T19:00:00.000Z",
    venue: "Main Hall",
    city: "Munich",
    address: "Street 5",
    organizer: "Eventoren",
    imageUrl: "",
    imageAlt: "",
    catalogVersion: 1,
    customerEmail: "buyer@example.test",
    subtotalCents: 5000,
    feeCents: 250,
    totalCents: 5250,
    paymentReference: "pay_ref_1",
    billingOrderReference: "bill_ord_1",
    stripeMode: "test" as const,
    status: "failed" as const,
    paymentStatus: "failed" as const,
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T14:00:00.000Z",
    ticketsIssuedAt: "2026-10-12T10:05:00.000Z",
    paymentMethodType: "sepa_debit",
    cancellation: cancellationData,
  }

  const mockTickets = [
    {
      _id: "ticket_1" as Id<"ticketIssued">,
      orderId,
      sequence: 1,
      code: "TICK-001",
      eventKey: "evt_1",
      eventTitle: "SEPA Concert",
      eventStartsAt: "2026-11-01T20:00:00.000Z",
      eventDoorsAt: "2026-11-01T19:00:00.000Z",
      venue: "Main Hall",
      city: "Munich",
      address: "Street 5",
      tierKey: "tier_standard",
      tierName: "Standard",
      priceCents: 5000,
      feeCents: 250,
      cancelled: true,
      issuedAt: "2026-10-12T10:05:00.000Z",
    },
  ]

  const ctx = {
    db: {
      get: async (table: string, id: string) => (table === "ticketOrders" && id === orderId ? mockOrder : null),
      query: (table: string) => ({
        withIndex: (_index: string, _filter: unknown) => ({
          collect: async () => (table === "ticketOrderLines" ? [] : table === "ticketIssued" ? mockTickets : []),
        }),
      }),
    },
  } as unknown as QueryCtx

  const result = await ticketOrderProjectionCreate(ctx, orderId)
  expect(result?.success).toBe(true)
  if (!result?.success) return

  expect(result.data.cancellation).toEqual(cancellationData)
  expect(result.data.tickets[0]?.cancelled).toBe(true)
})
