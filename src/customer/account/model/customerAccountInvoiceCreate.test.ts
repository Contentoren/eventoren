import { describe, expect, test } from "bun:test"
import { customerAccountInvoiceCreate } from "./customerAccountInvoiceCreate.ts"

describe("customerAccountInvoiceCreate", () => {
  const base = {
    bookingReference: "EV-260123",
    buyerName: "Lea Schneider",
    buyerEmail: "lea.schneider@example.de",
    eventTitle: "Indie Night",
    lines: [{ name: "Standard", quantity: 2, unitPriceCents: 2250 }],
    subtotalCents: 4500,
    feeCents: 128,
    totalCents: 4628,
  }
  test("projects invoice for paid orders", () => {
    const invoice = customerAccountInvoiceCreate({ ...base, paidAt: "2026-10-20T18:00:00.000Z" })
    expect(invoice?.invoiceNumber).toBe("EV-260123")
    expect(invoice?.issuedAt).toBe("2026-10-20T18:00:00.000Z")
    expect(invoice?.totalCents).toBe(4628)
  })

  test("unpaid orders yield no invoice", () => {
    expect(customerAccountInvoiceCreate(base)).toBeNull()
  })

  test("falls back to booking number when reference is missing", () => {
    const { bookingReference: _dropped, ...rest } = base
    const invoice = customerAccountInvoiceCreate({
      ...rest,
      bookingNumber: 42,
      checkoutCompletedAt: "2026-10-20T18:00:00.000Z",
    })
    expect(invoice?.invoiceNumber).toBe("EV-42")
  })
})
