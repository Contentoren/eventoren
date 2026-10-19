import { describe, expect, test } from "bun:test"
import { adminTicketOrdersSort } from "./adminTicketOrdersSort.ts"

const base = {
  customerEmail: "a@example.de",
  customerGivenName: "Anna",
  customerFamilyName: "Muster",
  paymentReference: "pi_1",
  bookingReference: undefined,
  bookingNumber: undefined,
  paymentStatus: "paid" as const,
  stripeMode: "live" as const,
} as const

function orderFixture(partial: {
  readonly id: string
  readonly totalCents?: number
  readonly createdAt?: string
  readonly customerFamilyName?: string
  readonly customerEmail?: string
  readonly paymentReference?: string
  readonly bookingNumber?: number
}) {
  return {
    ...base,
    customerFamilyName: partial.customerFamilyName ?? "Muster",
    customerEmail: partial.customerEmail ?? "a@example.de",
    paymentReference: partial.paymentReference ?? `pi_${partial.id}`,
    bookingNumber: partial.bookingNumber,
    totalCents: partial.totalCents ?? 1000,
    createdAt: partial.createdAt ?? "2026-10-18T10:00:00.000Z",
    id: partial.id,
  }
}

describe("adminTicketOrdersSort", () => {
  test("sortiert Nummer nach Buchungsnummer, sonst Zahlungsreferenz", () => {
    const orders = [
      orderFixture({ id: "b", paymentReference: "pi_9" }),
      orderFixture({ id: "a", bookingNumber: 42 }),
      orderFixture({ id: "c", paymentReference: "pi_1" }),
    ]
    expect(adminTicketOrdersSort(orders, "nummer", "asc").map((order) => order.id)).toEqual(["a", "c", "b"])
    expect(adminTicketOrdersSort(orders, "nummer", "desc").map((order) => order.id)).toEqual(["b", "c", "a"])
  })

  test("sortiert Käufer nach Name plus E-Mail", () => {
    const orders = [
      orderFixture({ id: "b", customerFamilyName: "Weber" }),
      orderFixture({ id: "a", customerFamilyName: "Auer" }),
    ]
    expect(adminTicketOrdersSort(orders, "kaeufer", "asc").map((order) => order.id)).toEqual(["a", "b"])
  })

  test("sortiert Betrag und Datum numerisch", () => {
    const orders = [
      orderFixture({ id: "teuer", totalCents: 5000, createdAt: "2026-10-19T10:00:00.000Z" }),
      orderFixture({ id: "billig", totalCents: 1000, createdAt: "2026-10-17T10:00:00.000Z" }),
    ]
    expect(adminTicketOrdersSort(orders, "betrag", "asc").map((order) => order.id)).toEqual(["billig", "teuer"])
    expect(adminTicketOrdersSort(orders, "datum", "desc").map((order) => order.id)).toEqual(["teuer", "billig"])
  })
})
