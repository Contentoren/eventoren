import { describe, expect, test } from "bun:test"
import type { Doc } from "#convex/_generated/dataModel.js"
import { catalogEventOverviewTicketCreate } from "./catalogEventOverviewTicketCreate.ts"

const ticket = { _id: "ticket-1", cancelled: false } as Doc<"ticketIssued">
const order = { _id: "order-1", paymentStatus: "paid", customerEmail: " Buyer@Example.COM " } as Doc<"ticketOrders">

describe("event overview ticket contributions", () => {
  test("paid valid tickets identify the buyer by normalized email", () => {
    expect(catalogEventOverviewTicketCreate(ticket, order)).toEqual({
      ticketId: "ticket-1",
      soldTicketCount: 1,
      buyerKey: "email:buyer@example.com",
    })
  })
  test("pending, failed, cancelled tickets and cancelled orders have no buyer or sale", () => {
    for (const [row, purchase] of [
      [ticket, { ...order, paymentStatus: "pending" }],
      [ticket, { ...order, paymentStatus: "failed" }],
      [{ ...ticket, cancelled: true }, order],
      [ticket, { ...order, cancellation: {} }],
    ] as [Doc<"ticketIssued">, Doc<"ticketOrders">][]) {
      expect(catalogEventOverviewTicketCreate(row, purchase)).toEqual({
        ticketId: "ticket-1",
        soldTicketCount: 0,
        buyerKey: null,
      })
    }
  })
  test("blank email falls back to purchaser user then order identity", () => {
    expect(
      catalogEventOverviewTicketCreate(ticket, {
        ...order,
        customerEmail: "  ",
        ownerUserId: "user-1" as Doc<"ticketOrders">["ownerUserId"],
      }).buyerKey,
    ).toBe("user:user-1")
    expect(catalogEventOverviewTicketCreate(ticket, { ...order, customerEmail: "" }).buyerKey).toBe("order:order-1")
  })
})
