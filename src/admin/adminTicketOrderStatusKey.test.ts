import { describe, expect, test } from "bun:test"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import { adminTicketOrdersStatusCounts } from "./adminTicketOrdersStatusCounts.ts"
import { adminTicketOrderStatusKey } from "./adminTicketOrderStatusKey.ts"
import { adminTicketOrderStatusLabel } from "./adminTicketOrderStatusLabel.ts"

function orderFixture(partial: {
  readonly paymentStatus: AdminTicketOrderSummary["paymentStatus"]
  readonly ticketsIssuedAt?: string
  readonly cancellation?: AdminTicketOrderSummary["cancellation"]
}) {
  return {
    paymentStatus: partial.paymentStatus,
    ticketsIssuedAt: partial.ticketsIssuedAt,
    cancellation: partial.cancellation,
  }
}

describe("adminTicketOrderStatusKey", () => {
  test("mappt Stornierung zuerst, dann paymentLabel-Reihenfolge", () => {
    expect(adminTicketOrderStatusKey(orderFixture({ paymentStatus: "paid" }))).toBe("bezahlt")
    expect(adminTicketOrderStatusKey(orderFixture({ paymentStatus: "pending" }))).toBe("offen")
    expect(
      adminTicketOrderStatusKey(
        orderFixture({ paymentStatus: "pending", ticketsIssuedAt: "2026-10-18T10:00:00.000Z" }),
      ),
    ).toBe("sepa")
    expect(adminTicketOrderStatusKey(orderFixture({ paymentStatus: "failed" }))).toBe("fehlgeschlagen")
    expect(adminTicketOrderStatusKey(orderFixture({ paymentStatus: "expired" }))).toBe("abgelaufen")
  })

  test("stornierte Bestellung schlägt bezahlten Status", () => {
    expect(
      adminTicketOrderStatusKey(
        orderFixture({
          paymentStatus: "paid",
          cancellation: {
            cancelledAt: "2026-10-19T10:00:00.000Z",
            organizationId: "org_test",
            eventKey: "event_test",
            orderReference: "order_test",
            paymentReference: "payment_abc123",
            stripeMode: "test",
            paymentMethodType: "sepa_debit",
            stripeEventId: "evt_abc123",
            stripeSessionId: "cs_abc123",
            stripePaymentIntentId: "pi_abc123",
            reason: "payment_failed",
            stripeEventType: "checkout.session.async_payment_failed",
            stripeChargeId: null,
            stripeDisputeId: null,
          },
        }),
      ),
    ).toBe("storniert")
  })
})

describe("adminTicketOrderStatusLabel", () => {
  test("labellt Chips ehrlich zu paymentLabel", () => {
    expect(adminTicketOrderStatusLabel("alle")).toBe("Alle")
    expect(adminTicketOrderStatusLabel("sepa")).toBe("SEPA in Bearbeitung")
    expect(adminTicketOrderStatusLabel("bezahlt")).toBe("Bezahlt")
    expect(adminTicketOrderStatusLabel("offen")).toBe("Offen")
    expect(adminTicketOrderStatusLabel("storniert")).toBe("Storniert")
    expect(adminTicketOrderStatusLabel("fehlgeschlagen")).toBe("Fehlgeschlagen")
    expect(adminTicketOrderStatusLabel("abgelaufen")).toBe("Abgelaufen")
  })
})

describe("adminTicketOrdersStatusCounts", () => {
  test("zählt alle Chips plus Alle als Gesamt", () => {
    const counts = adminTicketOrdersStatusCounts([
      orderFixture({ paymentStatus: "paid" }),
      orderFixture({ paymentStatus: "paid" }),
      orderFixture({ paymentStatus: "pending" }),
      orderFixture({ paymentStatus: "pending", ticketsIssuedAt: "2026-10-18T10:00:00.000Z" }),
      orderFixture({ paymentStatus: "failed" }),
      orderFixture({ paymentStatus: "expired" }),
      orderFixture({
        paymentStatus: "paid",
        cancellation: {
          cancelledAt: "2026-10-19T10:00:00.000Z",
          organizationId: "org_test",
          eventKey: "event_test",
          orderReference: "order_test",
          paymentReference: "payment_abc123",
          stripeMode: "test",
          paymentMethodType: "sepa_debit",
          stripeEventId: "evt_abc123",
          stripeSessionId: "cs_abc123",
          stripePaymentIntentId: "pi_abc123",
          reason: "payment_failed",
          stripeEventType: "checkout.session.async_payment_failed",
          stripeChargeId: null,
          stripeDisputeId: null,
        },
      }),
    ])
    expect(counts).toEqual({
      alle: 7,
      bezahlt: 2,
      offen: 1,
      sepa: 1,
      fehlgeschlagen: 1,
      abgelaufen: 1,
      storniert: 1,
    })
  })
})
